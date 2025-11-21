import { createTikTokStyleCaptions, parseSrt } from '@remotion/captions';
import type { Caption } from '@remotion/captions';
import type { TikTokCaptionPages } from '@/types';

interface ConvertOptions {
    combineWindowMs?: number;
}

interface ConvertResult {
    captions: Caption[];
    pages: TikTokCaptionPages;
}

export const srtToCaptionPages = (
    srt: string,
    options: ConvertOptions = {},
): ConvertResult => {
    const { combineWindowMs = 120 } = options;
    const { captions } = parseSrt({ input: srt });
    const { pages } = createTikTokStyleCaptions({
        captions,
        combineTokensWithinMilliseconds: combineWindowMs,
    });

    return { captions, pages };
};

