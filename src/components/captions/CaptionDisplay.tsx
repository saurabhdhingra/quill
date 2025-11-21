import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { TikTokCaptionPage } from '../../types';

interface CaptionDisplayProps {
  pages: TikTokCaptionPage[];
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const splitTokensIntoLines = (page: TikTokCaptionPage) => {
  const midpoint = Math.ceil(page.tokens.length / 2);
  const firstLine = page.tokens.slice(0, midpoint);
  const secondLine = page.tokens.slice(midpoint);

  return [firstLine, secondLine].filter((line) => line.length > 0);
};

export const CaptionDisplay: React.FC<CaptionDisplayProps> = ({ pages }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTimeMs = useMemo(() => (frame / fps) * 1000, [frame, fps]);

  const activePage = useMemo(() => {
    return pages.find((page) => {
      const pageStart = page.startMs;
      const pageEnd = page.startMs + page.durationMs;
      return currentTimeMs >= pageStart && currentTimeMs <= pageEnd;
    });
  }, [currentTimeMs, pages]);

  const lines = useMemo(
    () => (activePage ? splitTokensIntoLines(activePage) : []),
    [activePage],
  );

  if (!activePage) {
    return null;
  }

  return (
    <div className="w-full flex justify-center px-6 mb-10">
      <div className="rounded-2xl bg-black/60 backdrop-blur-md px-8 py-6 flex flex-col gap-3">
        {lines.map((line, lineIndex) => (
          <div
            key={`line-${lineIndex}-${line[0]?.fromMs ?? lineIndex}`}
            className="flex flex-wrap justify-center gap-3 text-6xl font-extrabold text-white drop-shadow-lg"
          >
            {line.map((token, tokenIndex) => {
              const tokenDuration = Math.max(token.toMs - token.fromMs, 1);
              const progress = clamp(
                (currentTimeMs - token.fromMs) / tokenDuration,
                0,
                1,
              );

              return (
                <span key={`token-${tokenIndex}-${token.text}`} className="relative inline-block">
                  <span className="relative z-10 px-1">{token.text}&nbsp;</span>
                  <span
                    className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-md origin-left"
                    style={{
                      transform: `scaleX(${progress})`,
                      opacity: progress > 0 ? 0.9 : 0,
                      transition: 'transform 0.1s linear, opacity 0.1s linear',
                    }}
                  />
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

