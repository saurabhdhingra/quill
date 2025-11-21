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

/**
 * Parse an SRT document into Remotion Caption objects and TikTok style pages.
 * Relies on the Caption data structure described in Remotion's docs:
 * https://www.remotion.dev/docs/captions/caption
 */
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

