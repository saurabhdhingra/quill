import { NextResponse } from 'next/server';
import { transcribeAudioBufferToSrt } from '@/lib/whisper';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio');

        if (!(audioFile instanceof File)) {
            return NextResponse.json({ error: 'Audio file is required.' }, { status: 400 });
        }

        const arrayBuffer = await audioFile.arrayBuffer();
        const srt = await transcribeAudioBufferToSrt(Buffer.from(arrayBuffer));

        return NextResponse.json({ srt });
    } catch (error) {
        console.error('Transcription failed:', error);
        return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
    }
}