import React from 'react';
import { AbsoluteFill, OffthreadVideo, useVideoConfig } from 'remotion';
import { CaptionDisplay } from '../components/captions/CaptionDisplay';
import type { TikTokCaptionPages } from '../types'; 

interface CaptionCompositionProps {
    staticSrc: string; // The S3 URL
    pages: TikTokCaptionPages;
    useStaticFile?: boolean;
}
export const CaptionComposition: React.FC<CaptionCompositionProps> = ({
    staticSrc,
    pages,
}) => {
    // Use useVideoConfig to get the dimensions calculated and overridden in the API route
    const { height } = useVideoConfig(); 

    return (
        <AbsoluteFill className="bg-black relative">
            {staticSrc ? (
                <AbsoluteFill className="z-10">
                    {/* Use OffthreadVideo with Tailwind classes for coverage */}
                    <OffthreadVideo src={staticSrc} className="w-full h-full object-cover" />
                </AbsoluteFill>
            ) : (
                // Placeholder when no video URL is provided
                <AbsoluteFill className="z-10 flex items-center justify-center text-gray-500 text-3xl font-bold">
                    No Video Loaded
                </AbsoluteFill>
            )}
            <AbsoluteFill
                // Use Tailwind classes for layout
                // ADDED 'justify-end' to push content to the bottom, ensuring bottom-center alignment.
                className="flex flex-col items-center justify-end z-20 pointer-events-none"
                style={{
                    // Padding is calculated based on the dynamic height for consistent placement
                    paddingBottom: height * 0.1 
                }}
            >
                <CaptionDisplay pages={pages} />
            </AbsoluteFill>

        </AbsoluteFill>
    );
};