import { Storage } from '@google-cloud/storage';

// Initialize storage with credentials from env
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

const bucketName = process.env.GCP_BUCKET_NAME || 'default-bucket';

export const generateV4UploadSignedUrl = async (filename: string) => {
  const options = {
    version: 'v4' as const,
    action: 'write' as const,
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType: 'video/mp4',
  };

  const [url] = await storage
    .bucket(bucketName)
    .file(filename)
    .getSignedUrl(options);

  // Determine the public URL (Assuming bucket is publicly readable or using signed read URLs later)
  // For simplicity in this demo, we assume we can generate a read-signed-url immediately 
  // or the bucket allows public read for the transcriber.
  // Let's generate a read signed URL valid for 1 hour for AssemblyAI to access.
  const [readUrl] = await storage
    .bucket(bucketName)
    .file(filename)
    .getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

  return { uploadUrl: url, publicUrl: readUrl };
};