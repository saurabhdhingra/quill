export type TikTokCaptionPages = ReturnType<
    typeof import('@remotion/captions')['createTikTokStyleCaptions']
>['pages'];

export type TikTokCaptionPage = TikTokCaptionPages[number];

export type Caption = import('@remotion/captions').Caption;

export interface TranscriptionResponse {
    srt: string;
}