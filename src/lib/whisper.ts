import path from 'node:path';
import os from 'node:os';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import {
    downloadWhisperModel,
    installWhisperCpp,
    toCaptions,
    transcribe,
} from '@remotion/install-whisper-cpp';

const WHISPER_CPP_VERSION = process.env.WHISPER_CPP_VERSION ?? '1.5.5';
const WHISPER_MODEL = process.env.WHISPER_MODEL ?? 'small.en';
const whisperInstallDir = path.join(process.cwd(), '.whisper');

let whisperReadyPromise: Promise<void> | null = null;

const ensureWhisperReady = () => {
    if (!whisperReadyPromise) {
        whisperReadyPromise = (async () => {
            await installWhisperCpp({
                version: WHISPER_CPP_VERSION,
                to: whisperInstallDir,
            });

            await downloadWhisperModel({
                model: WHISPER_MODEL,
                folder: whisperInstallDir,
            });
        })();
    }

    return whisperReadyPromise;
};

export const transcribeAudioBufferToSrt = async (buffer: Buffer) => {
    await ensureWhisperReady();

    const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'quill-whisper-'));
    const audioPath = path.join(tmpDir, 'input.wav');

    await writeFile(audioPath, buffer);

    try {
        const whisperOutput = await transcribe({
            model: WHISPER_MODEL,
            whisperPath: whisperInstallDir,
            whisperCppVersion: WHISPER_CPP_VERSION,
            inputPath: audioPath,
            tokenLevelTimestamps: true,
        });

        const normalizedTranscription = Array.isArray(whisperOutput.transcription)
            ? whisperOutput.transcription
            : typeof whisperOutput.transcription === 'object' && whisperOutput.transcription !== null
                ? Object.values(whisperOutput.transcription)
                : null;

        if (!normalizedTranscription || normalizedTranscription.length === 0) {
            console.error('Unexpected Whisper output shape', {
                keys: Object.keys(whisperOutput),
                transcriptionType: typeof whisperOutput.transcription,
                preview: JSON.stringify(whisperOutput).slice(0, 500),
            });
            throw new Error('Unexpected transcription format returned by Whisper.');
        }

        const { captions } = toCaptions({
            whisperCppOutput: {
                ...whisperOutput,
                transcription: normalizedTranscription,
            },
        });
        return captionsToSrt(captions);
    } finally {
        await rm(tmpDir, { recursive: true, force: true });
    }
};

interface CaptionChunk {
    text: string;
    startMs: number;
    endMs: number;
}

const formatTimestamp = (ms: number) => {
    const date = new Date(ms);
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');
    return `${hours}:${minutes}:${seconds},${milliseconds}`;
};

const captionsToSrt = (captions: CaptionChunk[]) =>
    captions
        .map((caption, index) => {
            const start = formatTimestamp(caption.startMs);
            const end = formatTimestamp(caption.endMs);
            const safeText = caption.text.trim();
            return `${index + 1}\n${start} --> ${end}\n${safeText}\n`;
        })
        .join('\n');

