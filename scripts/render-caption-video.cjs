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
    output,
    props: propsJsonString, // 💡 NEW: Read the --props argument
    duration,
    fps,
    width,
    height,
  } = args;

  // 💡 UPDATED CHECK: Only require the essential Remotion render arguments
  if (!entry || !composition || !output || !propsJsonString) {
    throw new Error('Missing required arguments for render-caption-video script. Expected: --entry, --composition, --output, --props');
  }

  // 💡 REMOVED: const { staticSrc, pages: pagesPath, ... } = args;
  // 💡 REMOVED: The old check for staticSrc, output, and pagesPath

  // 1. Parse the props JSON string passed from route.ts
  const inputProps = JSON.parse(propsJsonString);

  // 💡 REMOVED: const pages = JSON.parse(await fs.readFile(pagesPath, 'utf-8'));

  const serveUrl = await bundle(entry);

  try {
    const compositions = await getCompositions(serveUrl, {
      // 💡 Pass the parsed inputProps to getCompositions
      inputProps: inputProps,
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
      // 💡 Pass the parsed inputProps directly to renderMedia
      inputProps: inputProps,
    });
  } finally {
    await fs.rm(serveUrl, { recursive: true, force: true });
  }
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});