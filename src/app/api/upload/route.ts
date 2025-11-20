import { NextResponse } from 'next/server';
import { generateV4UploadSignedUrl } from '@/lib/gcp';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const { filename } = await request.json();
    
    // Sanitize and create a unique filename
    const uniqueId = uuidv4(); // You might need to install 'uuid' or just use Date.now()
    const uniqueFilename = `uploads/${uniqueId}-${filename}`;

    const { uploadUrl, publicUrl } = await generateV4UploadSignedUrl(uniqueFilename);

    return NextResponse.json({ 
      url: uploadUrl, 
      publicUrl,
      filename: uniqueFilename 
    });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}