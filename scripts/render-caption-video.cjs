#!/usr/bin/env node

const path = require('node:path');
const fs = require('node:fs/promises');
const { bundle } = require('@remotion/bundler');
const { getCompositions, renderMedia } = require('@remotion/renderer');

const parseArgs = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key?.startsWith('--') || typeof value === 'undefined') {
      throw new Error(`Invalid argument pair starting at position ${i}: ${key} ${value}`);
    }
    args[key.slice(2)] = value;
  }
  return args;
};

const ensureNumber = (value, fallback) => {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const {
    entry,
    composition,
    staticSrc,
    output,
    pages: pagesPath,
    duration,
    fps,
    width,
    height,
  } = args;

  if (!entry || !composition || !staticSrc || !output || !pagesPath) {
    throw new Error('Missing required arguments for render-caption-video script.');
  }

  const pages = JSON.parse(await fs.readFile(pagesPath, 'utf-8'));

  const serveUrl = await bundle(entry);

  try {
    const compositions = await getCompositions(serveUrl, {
      inputProps: { videoSrc: '', pages: [], useStaticFile: true },
    });

    const targetComposition = compositions.find((c) => c.id === composition);
    if (!targetComposition) {
      throw new Error(`Composition ${composition} not found in bundle.`);
    }

    const resolvedComposition = {
      ...targetComposition,
      durationInFrames: ensureNumber(duration, targetComposition.durationInFrames),
      fps: ensureNumber(fps, targetComposition.fps),
      width: ensureNumber(width, targetComposition.width),
      height: ensureNumber(height, targetComposition.height),
    };

    await renderMedia({
      composition: resolvedComposition,
      serveUrl,
      codec: 'h264',
      outputLocation: output,
      inputProps: {
        videoSrc: staticSrc,
        pages,
        useStaticFile: true,
      },
    });
  } finally {
    await fs.rm(serveUrl, { recursive: true, force: true });
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

