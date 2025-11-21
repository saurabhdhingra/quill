const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const {
  installWhisperCpp,
  downloadWhisperModel,
  transcribe,
  toCaptions,
} = require('@remotion/install-whisper-cpp');

const WHISPER_CPP_VERSION = '1.5.5';
const WHISPER_MODEL = 'small.en';
const whisperInstallDir = path.join(process.cwd(), '.whisper');

const ensureWhisperReady = async () => {
  await installWhisperCpp({
    version: WHISPER_CPP_VERSION,
    to: whisperInstallDir,
  });

  await downloadWhisperModel({
    model: WHISPER_MODEL,
    folder: whisperInstallDir,
  });
};

const captionsToSrt = (captions) =>
  captions
    .map((caption, index) => {
      const start = caption.startMs;
      const end = caption.endMs;
      return `${index + 1}\n${start} --> ${end}\n${caption.text}\n`;
    })
    .join('\n');

const main = async () => {
  const wavBuffer = fs.readFileSync(path.join(process.cwd(), 'scripts', 'tone.wav'));
  await ensureWhisperReady();
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'quill-whisper-'));
  const audioPath = path.join(tmpDir, 'input.wav');
  writeFileSync(audioPath, wavBuffer);

  try {
    const whisperOutput = await transcribe({
      model: WHISPER_MODEL,
      whisperPath: whisperInstallDir,
      whisperCppVersion: WHISPER_CPP_VERSION,
      inputPath: audioPath,
      tokenLevelTimestamps: true,
    });

    console.log('Is array?', Array.isArray(whisperOutput.transcription));
    const { captions } = toCaptions({ whisperCppOutput: whisperOutput });
    console.log('Captions count:', captions.length);
    console.log(captions[0]);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

