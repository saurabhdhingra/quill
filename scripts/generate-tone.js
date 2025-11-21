const fs = require('node:fs');
const path = require('node:path');

const SAMPLE_RATE = 16000;
const DURATION_SECONDS = 2;
const FREQUENCY = 440;
const AMPLITUDE = 12000;

const numSamples = SAMPLE_RATE * DURATION_SECONDS;
const buffer = Buffer.alloc(numSamples * 2);

for (let i = 0; i < numSamples; i++) {
  const t = i / SAMPLE_RATE;
  const sample = Math.sin(2 * Math.PI * FREQUENCY * t) * AMPLITUDE;
  buffer.writeInt16LE(sample, i * 2);
}

const header = Buffer.alloc(44);
const byteRate = SAMPLE_RATE * 2;
const blockAlign = 2;
const subchunk2Size = numSamples * 2;
const chunkSize = 36 + subchunk2Size;

header.write('RIFF', 0);
header.writeUInt32LE(chunkSize, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16); // PCM chunk size
header.writeUInt16LE(1, 20); // PCM format
header.writeUInt16LE(1, 22); // Mono
header.writeUInt32LE(SAMPLE_RATE, 24);
header.writeUInt32LE(byteRate, 28);
header.writeUInt16LE(blockAlign, 32);
header.writeUInt16LE(16, 34); // Bits per sample
header.write('data', 36);
header.writeUInt32LE(subchunk2Size, 40);

const outPath = path.join(process.cwd(), 'scripts', 'tone.wav');
fs.writeFileSync(outPath, Buffer.concat([header, buffer]));
console.log(`Wrote test tone to ${outPath}`);

