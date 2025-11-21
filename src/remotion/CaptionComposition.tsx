import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile } from 'remotion';
import { CaptionDisplay } from '../components/captions/CaptionDisplay';
import type { TikTokCaptionPages } from '../types';

interface CaptionCompositionProps {
    staticSrc: string;
    pages: TikTokCaptionPages;
    useStaticFile?: boolean;
}
export const CaptionComposition: React.FC<CaptionCompositionProps> = ({
    staticSrc,
    pages,
    useStaticFile = true,
}) => {
    const resolvedVideoSrc = useStaticFile ? staticFile(staticSrc) : staticSrc;

    // Apply basic relative styling to the main container
    return (
        <AbsoluteFill className="bg-black relative"> 
            
            {staticSrc ? (
                <AbsoluteFill className="z-10">
                    <OffthreadVideo src={resolvedVideoSrc} className="w-full h-full object-cover" />
                </AbsoluteFill>
            ) : (
                // Fallback rendering
                <AbsoluteFill className="z-10 flex items-center justify-center text-gray-500">
                    No Video Loaded
                </AbsoluteFill>
            )}
            <AbsoluteFill 

                className="flex flex-col items-center justify-end z-20 pointer-events-none pb-10"
            >
                <CaptionDisplay pages={pages} />
            </AbsoluteFill>

        </AbsoluteFill>
    );
};