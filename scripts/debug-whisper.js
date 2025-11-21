const path = require('node:path');
const fs = require('node:fs');
const {
  installWhisperCpp,
  downloadWhisperModel,
  transcribe,
} = require('@remotion/install-whisper-cpp');

const WHISPER_CPP_VERSION = '1.5.5';
const WHISPER_MODEL = 'small.en';

const whisperInstallDir = path.join(process.cwd(), '.whisper');
const wavPath = path.join(process.cwd(), 'scripts', 'tone.wav');

const ensureAssets = async () => {
  await installWhisperCpp({
    version: WHISPER_CPP_VERSION,
    to: whisperInstallDir,
  });

  await downloadWhisperModel({
    model: WHISPER_MODEL,
    folder: whisperInstallDir,
  });
};

const main = async () => {
  if (!fs.existsSync(wavPath)) {
    throw new Error('tone.wav missing, run scripts/generate-tone.js first.');
  }

  await ensureAssets();

  const json = await transcribe({
    model: WHISPER_MODEL,
    whisperPath: whisperInstallDir,
    whisperCppVersion: WHISPER_CPP_VERSION,
    inputPath: wavPath,
    tokenLevelTimestamps: true,
    printOutput: false,
  });

  console.log('Transcription keys:', Object.keys(json));
  console.log('Transcription type:', typeof json.transcription);
  console.log('Is array?', Array.isArray(json.transcription));
  console.log('Sample items length:', json.transcription?.length);
  if (Array.isArray(json.transcription)) {
    console.log('First item sample:', json.transcription[0]);
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

