import React, { useEffect, useState } from 'react';

// [PRODUCTION] In your real app, uncomment the line below and remove the Mocks section
// import { AbsoluteFill, OffthreadVideo, useVideoConfig, useCurrentFrame } from 'remotion';

// --- START MOCKS (For Preview Only) ---
const useVideoConfig = () => ({ fps: 30 });

const useCurrentFrame = () => {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % 900); // Loop every 30s
    }, 33.33);
    return () => clearInterval(interval);
  }, []);
  return frame;
};

const AbsoluteFill: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={className} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
    {children}
  </div>
);

const OffthreadVideo: React.FC<{ src: string; className?: string }> = ({ src, className }) => (
  <video src={src} className={className} muted loop playsInline autoPlay />
);
// --- END MOCKS ---

// Interface for the data (In production this comes from @/types)
export interface AssemblyAIWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
  speaker: string | null;
}

interface CaptionCompositionProps {
  videoUrl: string;
  captions: AssemblyAIWord[];
}

export const CaptionComposition: React.FC<CaptionCompositionProps> = ({
  videoUrl,
  captions,
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const currentTimeInMs = (frame / fps) * 1000;

  // Find the active word based on current time
  // We extend the duration slightly so words don't flicker too fast
  const activeWord = captions.find(
    (word) => currentTimeInMs >= word.start && currentTimeInMs <= word.end
  );

  return (
    <AbsoluteFill className="bg-black overflow-hidden relative">
      {videoUrl ? (
        <OffthreadVideo 
          src={videoUrl} 
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-500">
          No Video Loaded
        </div>
      )}
      
      <AbsoluteFill className="flex flex-col items-center justify-end pb-24">
        <div className="px-6 py-4 rounded-xl bg-black/60 backdrop-blur-sm">
            <h1 
              className="text-5xl font-bold text-white text-center drop-shadow-lg font-sans transition-all duration-200"
              style={{
                opacity: activeWord ? 1 : 0,
                transform: activeWord ? 'scale(1)' : 'scale(0.95)'
              }}
            >
              {activeWord?.text || ' '}
            </h1>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};