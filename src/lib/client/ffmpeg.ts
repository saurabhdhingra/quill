import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import type { FileData } from '@ffmpeg/ffmpeg'; 

let ffmpegInstance: FFmpeg | null = null;

const loadFfmpeg = async () => {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  // Note: ensure you have initialized FFmpeg with the correct core path if needed.
  ffmpegInstance = new FFmpeg();
  await ffmpegInstance.load();
  return ffmpegInstance;
};

export const extractWavFromVideo = async (file: File) => {
  const ffmpeg = await loadFfmpeg();
  const inputName = 'input-video.mp4';
  const outputName = 'output-audio.wav';


  await ffmpeg.writeFile(inputName, await fetchFile(file));


  await ffmpeg.exec([
    '-i',
    inputName,
    '-vn', // No video
    '-acodec',
    'pcm_s16le', // Signed 16-bit little-endian PCM (uncompressed WAV format)
    '-ar',
    '16000', // Sample rate for transcription (16kHz is standard)
    '-ac',
    '1', // Mono channel
    outputName,
  ]);

  const data = await ffmpeg.readFile(outputName);

  // 4. Clean up files
  await Promise.all([
    ffmpeg.deleteFile(inputName),
    ffmpeg.deleteFile(outputName),
  ]);

  const audioArray = new Uint8Array(data as unknown as ArrayBuffer);
  
  return new Blob([audioArray], { type: 'audio/wav' });
};