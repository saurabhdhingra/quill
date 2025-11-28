import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto'; // Keeping for unique IDs
import { srtToCaptionPages } from '@/lib/captions';

// Required for Remotion Lambda and S3 operations
import { renderMediaOnLambda, getRenderProgress, AwsRegion } from '@remotion/lambda/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
// REMOVED: import { getMetadata } from '@remotion/media-utils'; to fix "use client" error.

// --- Environment Variables ---
const REGION = process.env.AWS_REGION as string;
const FUNCTION_NAME = process.env.REMOTION_FUNCTION_NAME as string;
const BUCKET_NAME = process.env.REMOTION_BUCKET as string;
// CRITICAL FIX: Added environment variable for the Remotion bundle URL
const SERVE_URL = process.env.REMOTION_SERVE_URL as string;
// CRITICAL: Must match the ID defined in RemotionRoot.tsx
const COMPOSITION_ID = 'CaptionVideo';

// Default values since we can't probe metadata now
const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 720;
const DEFAULT_FPS = 30;
const DEFAULT_DURATION_FRAMES = DEFAULT_FPS * 30; // Default to 30 seconds

// Helper function to validate required environment variables
function validateEnv() {
    // CRITICAL FIX: Added SERVE_URL validation
    if (!REGION || !FUNCTION_NAME || !BUCKET_NAME || !SERVE_URL) {
        const missing = [];
        if (!REGION) missing.push('AWS_REGION');
        if (!FUNCTION_NAME) missing.push('REMOTION_FUNCTION_NAME');
        if (!BUCKET_NAME) missing.push('REMOTION_BUCKET');
        if (!SERVE_URL) missing.push('REMOTION_SERVE_URL'); // New required variable

        console.error('Missing Remotion Lambda configuration:', missing.join(', '));
        throw new Error(`Lambda configuration error: Missing environment variables: ${missing.join(', ')}`);
    }
}

// Helper to upload the video file to S3
async function uploadFileToS3(file: File, key: string, bucket: string, region: string): Promise<string> {
    // Note: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are read automatically from environment
    const s3Client = new S3Client({ region });
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: file.type,
        ACL: 'public-read' // Ensures the Lambda can access the video
    });

    await s3Client.send(command);

    // Construct the public URL for the video in S3
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

const parsePositiveNumber = (value: FormDataEntryValue | null) => {
    if (typeof value !== 'string') {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};


export async function POST(request: Request) {

    try {
        // 1. Validate environment
        validateEnv();

        const formData = await request.formData();
        const videoFile = formData.get('video');
        const srt = formData.get('srt');

        if (!(videoFile instanceof File)) {
            return NextResponse.json({ error: 'Video file missing.' }, { status: 400 });
        }

        if (typeof srt !== 'string' || !srt.trim()) {
            return NextResponse.json({ error: 'SRT payload missing.' }, { status: 400 });
        }

        const durationOverride = parsePositiveNumber(formData.get('durationInFrames'));
        const fpsOverride = parsePositiveNumber(formData.get('fps'));
        const widthOverride = parsePositiveNumber(formData.get('width'));
        const heightOverride = parsePositiveNumber(formData.get('height'));

        // 2. Prepare data and upload video to S3
        const { pages } = srtToCaptionPages(srt);
        const renderId = randomUUID();

        const videoS3Key = `input-videos/${renderId}-${videoFile.name}`;
        const videoS3Url = await uploadFileToS3(videoFile, videoS3Key, BUCKET_NAME, REGION);

        console.log(`Video uploaded to S3: ${videoS3Url}`);

        // --- TEMPORARILY USING DEFAULTS TO FIX "USE CLIENT" ERROR ---

        const videoFps = fpsOverride || DEFAULT_FPS;
        const videoDurationInFrames = durationOverride || DEFAULT_DURATION_FRAMES;
        const videoWidth = widthOverride || DEFAULT_WIDTH;
        const videoHeight = heightOverride || DEFAULT_HEIGHT;
        // --- END TEMPORARILY USING DEFAULTS ---

        // 3. Define Input Props for Remotion Composition
        const customProps = {
            staticSrc: videoS3Url, // The URL must be passed to the Remotion component
            pages: pages,          // Prop name must match component prop (pages)
        };

        // 4. Start the rendering job on AWS Lambda
        console.log(`Starting Lambda render job for composition: ${COMPOSITION_ID}`);

        const { renderId: lambdaRenderId } = await renderMediaOnLambda({
            region: REGION as AwsRegion,
            functionName: FUNCTION_NAME,
            // CRITICAL FIX: Pass the serveUrl so Lambda can fetch the bundle
            serveUrl: SERVE_URL,
            composition: COMPOSITION_ID,
            inputProps: customProps,




            forceWidth: videoWidth,
            forceHeight: videoHeight,

            // Configuration for the output
            codec: 'h264',
            imageFormat: 'jpeg',
            logLevel: 'verbose',
            // Set to a unique key in the bucket for the final output
            outName: `output-videos/${renderId}-captioned.mp4`

        });

        // 5. Poll for status (This is required since we cannot keep a Vercel function running for long)
        let isDone = false;
        let finalOutputUrl = '';

        // Define max wait time (e.g., 90 seconds, well within Vercel's limit)
        const MAX_WAIT_TIME_MS = 90000;
        const POLL_INTERVAL_MS = 3000;
        let elapsed = 0;

        while (!isDone && elapsed < MAX_WAIT_TIME_MS) {
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
            elapsed += POLL_INTERVAL_MS;

            const progress = await getRenderProgress({
                // Ensure region is the correct enum/string literal for Remotion Lambda Client
                region: REGION as any, // You might want a runtime/map for strict regions
                bucketName: BUCKET_NAME,
                renderId: lambdaRenderId,
                functionName: FUNCTION_NAME,
            });

            // "progress.progress" does not exist—per Remotion, use "progress.overallProgress" (0-1 number)
            // Also, Remotion may provide outputFile at progress.outputFile if done.
            const percent = progress.overallProgress !== undefined
                ? Math.round(progress.overallProgress * 100)
                : 0;
            console.log(`Render Progress: ${percent}% (${elapsed / 1000}s elapsed)`);

            if (progress.overallProgress === 1 && progress.outputFile) {
                isDone = true;
                finalOutputUrl = progress.outputFile;
            } else if (progress.overallProgress === 0 && progress.fatalErrorEncountered) {
                throw new Error(`Lambda Render Failed: ${progress.fatalErrorEncountered}`);
            }
        }

        if (!isDone) {
            throw new Error('Rendering timed out while waiting for Lambda result.');
        }

        // 6. Return the final video URL (which is an S3 public URL)
        return NextResponse.json({
            success: true,
            message: 'Video rendering complete.',
            videoUrl: finalOutputUrl // Client will need to fetch this URL
        }, { status: 200 });

    } catch (error) {
        console.error('Lambda Render Error:', error);
        return NextResponse.json({
            success: false,
            error: `Video render failed on Lambda. Detail: ${error instanceof Error ? error.message : 'Unknown error.'}`
        }, { status: 500 });
    }
}