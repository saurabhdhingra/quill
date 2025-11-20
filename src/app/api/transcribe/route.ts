import { NextResponse } from 'next/server';
import { AssemblyAI } from 'assemblyai';

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY || '',
});

export async function POST(request: Request) {
  try {
    const { audioUrl } = await request.json();

    if (!audioUrl) {
      return NextResponse.json({ error: 'Audio URL required' }, { status: 400 });
    }

    // Start the transcription
    const transcript = await client.transcripts.transcribe({
      audio: audioUrl,
    });

    if (transcript.status === 'error') {
      throw new Error(transcript.error);
    }

    // In a production app, we would use webhooks. 
    // Since the prompt asks for a simple flow, we are awaiting the result 
    // (AssemblyAI SDK's transcribe method awaits completion by default unless configured otherwise).
    
    return NextResponse.json({ 
      status: 'completed', 
      words: transcript.words 
    });

  } catch (error) {
    console.error('Transcription failed:', error);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
}