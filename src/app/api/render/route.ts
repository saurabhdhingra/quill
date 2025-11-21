import { NextResponse } from 'next/server';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import { srtToCaptionPages } from '@/lib/captions';

const REMOTION_ENTRY = path.join(process.cwd(), 'src', 'remotion', 'index.tsx');
const PUBLIC_RENDER_DIR = path.join(process.cwd(), 'public', 'remotion-inputs');
const COMPOSITION_ID = 'CaptionVideo';

export const runtime = 'nodejs';


const ensurePublicDir = async () => {
    await fs.mkdir(PUBLIC_RENDER_DIR, { recursive: true });
};

const bufferFromFile = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
};

const parsePositiveNumber = (value: FormDataEntryValue | null) => {
    if (typeof value !== 'string') {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const runRenderScript = (args: string[]) =>
    new Promise<void>((resolve, reject) => {
        const scriptPath = path.join(process.cwd(), 'scripts', 'render-caption-video.cjs');
        const child = spawn(process.execPath, [scriptPath, ...args], {
            stdio: 'inherit',
        });

        child.on('error', reject);
        child.on('exit', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Renderer script exited with code ${code}`));
            }
        });
    });

export async function POST(request: Request) {
    let tmpDir: string | null = null;
    let publicFilePath: string | null = null;

    try {
        await ensurePublicDir();

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

        const { pages } = srtToCaptionPages(srt);
        const renderId = randomUUID();
        tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'quill-render-'));

        const uploadedVideoPath = path.join(tmpDir, `${renderId}-input.mp4`);
        await fs.writeFile(uploadedVideoPath, await bufferFromFile(videoFile));

        const publicFileName = `${renderId}.mp4`;
        publicFilePath = path.join(PUBLIC_RENDER_DIR, publicFileName);
        await fs.copyFile(uploadedVideoPath, publicFilePath);

        const staticFilePath = path.posix.join('remotion-inputs', publicFileName).replace(/\\/g, '/');
        const outputLocation = path.join(tmpDir, `${renderId}-captioned.mp4`);
        
        const customProps = {
            staticSrc: staticFilePath, // Prop name must match component prop (staticSrc)
            pages: pages,               // Prop name must match component prop (pages)
            useStaticFile: true,        // Recommended to be explicit
        };

        const scriptArgs = [
            '--entry',
            REMOTION_ENTRY,
            '--composition',
            COMPOSITION_ID,
            '--output',
            outputLocation,
            '--props', 
            JSON.stringify(customProps),
        ];



        if (durationOverride) {
            scriptArgs.push('--duration', String(durationOverride));
        }
        if (fpsOverride) {
            scriptArgs.push('--fps', String(fpsOverride));
        }
        if (widthOverride) {
            scriptArgs.push('--width', String(widthOverride));
        }
        if (heightOverride) {
            scriptArgs.push('--height', String(heightOverride));
        }

        await runRenderScript(scriptArgs);

        const renderedVideo = await fs.readFile(outputLocation);
        const base64 = renderedVideo.toString('base64');

        return NextResponse.json({
            video: base64,
            mimeType: 'video/mp4',
        });
    } catch (error) {
        console.error('Video render failed:', error);
        return NextResponse.json({ error: 'Video render failed.' }, { status: 500 });
    } finally {
        await Promise.all([
            tmpDir ? fs.rm(tmpDir, { recursive: true, force: true }) : Promise.resolve(),
            publicFilePath ? fs.rm(publicFilePath, { force: true }) : Promise.resolve(),
        ]);
    }
}