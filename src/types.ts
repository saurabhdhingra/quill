export interface AssemblyAIWord {
    text: string;
    start: number;
    end: number;
    confidence: number;
    speaker: string | null;
}

export interface CaptionResponse {
    words: AssemblyAIWord[];
    status: 'processing' | 'completed' | 'error';
    text?: string;
}

export interface UploadResponse {
    url: string;      // The signed URL for putting the file
    publicUrl: string; // The accessible URL for the transcriber
    filename: string;
}