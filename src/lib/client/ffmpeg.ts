import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;

const loadFfmpeg = async () => {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  ffmpegInstance = new FFmpeg();
  await ffmpegInstance.load();
  return ffmpegInstance;
};

export const extractWavFromVideo = async (file: File) => {
  const ffmpeg = await loadFfmpeg();
  const inputName = 'input-video.mp4';
  const outputName = 'output-audio.wav';

  // Write the file to FFmpeg's in-memory filesystem
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // Run FFmpeg to extract mono 16k wav audio suitable for Whisper
  await ffmpeg.exec([
    '-i',
    inputName,
    '-vn',
    '-acodec',
    'pcm_s16le',
    '-ar',
    '16000',
    '-ac',
    '1',
    outputName,
  ]);

  const data = await ffmpeg.readFile(outputName);

  await Promise.all([
    ffmpeg.deleteFile(inputName),
    ffmpeg.deleteFile(outputName),
  ]);

  return new Blob([data.buffer], { type: 'audio/wav' });
};

