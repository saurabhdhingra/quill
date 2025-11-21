import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile } from 'remotion';
import { CaptionDisplay } from '../components/captions/CaptionDisplay';
import type { TikTokCaptionPages } from '../types';

interface CaptionCompositionProps {
    videoSrc: string;
    pages: TikTokCaptionPages;
    useStaticFile?: boolean;
}

export const CaptionComposition: React.FC<CaptionCompositionProps> = ({
    videoSrc,
    pages,
    useStaticFile = false,
}) => {
    const resolvedVideoSrc = useStaticFile ? staticFile(videoSrc) : videoSrc;

    return (
        <AbsoluteFill className="bg-black overflow-hidden relative">
            {resolvedVideoSrc ? (
                <OffthreadVideo src={resolvedVideoSrc} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                    No Video Loaded
                </div>
            )}

            <AbsoluteFill className="flex flex-col items-center justify-end pointer-events-none">
                <CaptionDisplay pages={pages} />
            </AbsoluteFill>
        </AbsoluteFill>
    );
};
