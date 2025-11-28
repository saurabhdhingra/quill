'use client';

import  { useState, useCallback,  useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2, UploadCloud, RefreshCw, Download } from 'lucide-react';
import { clsx } from 'clsx';

// CORRECTED IMPORTS: Switched from fragile relative paths (../../) to Next.js path aliases (@/lib)
import { extractWavFromVideo } from '@/lib/client/ffmpeg';
import { srtToCaptionPages } from '@/lib/captions';
import type { TikTokCaptionPages, TranscriptionResponse } from '@/types';

const fontStyles = {
  playfair: { fontFamily: '"Playfair Display", serif' },
  inter: { fontFamily: '"Inter", sans-serif' },
};

type AppState = 'IDLE' | 'UPLOADING' | 'GENERATING' | 'RENDERING' | 'READY';

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;
const cleanFileName = (filename: string) =>
  filename.replace(/\.[^/.]+$/, '') || 'audio';

const getVideoDuration = (url: string) =>
  new Promise<number>((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = url;
    video.onloadedmetadata = () => {
      resolve(isNaN(video.duration) ? 0 : video.duration);
    };
    video.onerror = () => reject(new Error('Unable to read video metadata.'));
  });

const triggerDownload = (url: string, filename: string) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function Home() {
  const [state, setState] = useState<AppState>('IDLE');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [renderedVideoUrl, setRenderedVideoUrl] = useState<string | null>(null);
  // We no longer store the blob, only the public URL
  // const [renderedVideoBlob, setRenderedVideoBlob] = useState<Blob | null>(null); 
  const [captionPages, setCaptionPages] = useState<TikTokCaptionPages>([]);
  const [srtContent, setSrtContent] = useState<string | null>(null); 
  const [durationInFrames, setDurationInFrames] = useState(FPS * 60);
  const [error, setError] = useState<string | null>(null);

  const updatePreviewUrl = useCallback((nextUrl: string | null) => {
    setPreviewUrl((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev);
      }
      return nextUrl;
    });
  }, []);
  const updateRenderedUrl = useCallback((nextUrl: string | null) => {
    setRenderedVideoUrl((prev) => {
      // No longer revoking object URLs since the new URL is an S3 URL, not a local Blob URL
      return nextUrl;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      // No need to revoke renderedVideoUrl if it's an S3 URL
    };
  }, [previewUrl]); // Removed renderedVideoUrl from dependency array

  const renderFinalVideo = useCallback(
    async (file: File, srt: string, frames: number) => {
      setState('RENDERING');
      const formData = new FormData();
      formData.append('video', file);
      formData.append('srt', srt);
      formData.append('durationInFrames', String(frames));
      formData.append('fps', String(FPS));
      formData.append('width', String(WIDTH));
      formData.append('height', String(HEIGHT));
      
      const response = await fetch('/api/render', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // The API now returns a structured error message
        const errorPayload = await response.json();
        throw new Error(errorPayload.error || 'Failed to render video with captions (Lambda error).');
      }

      // The new payload returns the public S3 video URL
      const payload = (await response.json()) as { success: boolean; videoUrl: string };
      
      const finalUrl = payload.videoUrl; // Directly use the S3 URL
      
      // We no longer set the blob, only the URL
      updateRenderedUrl(finalUrl);
      setState('READY');
    },
    [updateRenderedUrl],
  );

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setCaptionPages([]);
      setSrtContent(null); 
      updateRenderedUrl(null);
      setState('UPLOADING');

      const blobUrl = URL.createObjectURL(file);
      updatePreviewUrl(blobUrl);

      let computedFrames = FPS * 60;
      try {
        const durationSeconds = await getVideoDuration(blobUrl);
        computedFrames = Math.max(Math.ceil(durationSeconds * FPS), FPS * 2);
        setDurationInFrames(computedFrames);
      } catch (metadataError) {
        console.warn('Unable to resolve metadata for uploaded video.', metadataError);
        setDurationInFrames(FPS * 60);
      }

      setState('GENERATING');

      try {
        const audioBlob = await extractWavFromVideo(file);
        const audioFile = new File([audioBlob], `${cleanFileName(file.name)}.wav`, {
          type: 'audio/wav',
        });

        const formData = new FormData();
        formData.append('audio', audioFile);

        const transcriptionResponse = await fetch('/api/transcribe', {
          method: 'POST',
          body: formData,
        });

        if (!transcriptionResponse.ok) {
          throw new Error('Unable to generate captions for this video.');
        }

        const payload = (await transcriptionResponse.json()) as TranscriptionResponse;
        const { srt } = payload; 
        const { pages } = srtToCaptionPages(srt);
        
        setCaptionPages(pages);
        setSrtContent(srt); 
        
        await renderFinalVideo(file, srt, computedFrames);
      } catch (processingError) {
        console.error('Processing failed:', processingError);
        setError(
          processingError instanceof Error
            ? processingError.message
            : 'Something went wrong while generating captions.',
        );
        setState('IDLE');
        updatePreviewUrl(null);
        updateRenderedUrl(null);
        setCaptionPages([]);
        setSrtContent(null); 
      }
    },
    [renderFinalVideo, updatePreviewUrl, updateRenderedUrl],
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) {
        return;
      }
      void processFile(file);
    },
    [processFile],
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/mp4': ['.mp4'] },
    maxSize: 35 * 1024 * 1024,
    maxFiles: 1,
    disabled: state !== 'IDLE',
  });

  const handleReset = () => {
    setCaptionPages([]);
    setSrtContent(null); 
    setError(null);
    setState('IDLE');
    updatePreviewUrl(null);
    updateRenderedUrl(null);
  };

  const handleDownload = () => {
    if (!renderedVideoUrl) { 
      return;
    }

    // Since renderedVideoUrl is now the public S3 URL, we pass it directly
    triggerDownload(renderedVideoUrl, 'captioned-video.mp4');
  };
  
  // Function to download the SRT file
  const handleDownloadSrt = () => {
    if (!srtContent) {
      return;
    }
    
    const srtBlob = new Blob([srtContent], { type: 'text/plain;charset=utf-8' });
    const srtUrl = URL.createObjectURL(srtBlob);
    
    triggerDownload(srtUrl, 'captions.srt');
    
    URL.revokeObjectURL(srtUrl);
  };
  
  const showRenderedVideo = state === 'READY' && Boolean(renderedVideoUrl);
  const showRemotionPreview =
    !showRenderedVideo && Boolean(previewUrl) && captionPages.length > 0;

  const isBusy = state === 'UPLOADING' || state === 'GENERATING' || state === 'RENDERING';

  return (
    <main
      className={clsx(
        'min-h-screen flex flex-col items-center justify-center p-6',
        'bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50',
      )}
      style={fontStyles.inter}
    >
      <div className="text-center mb-12 max-w-2xl">
        <h1
          className="text-5xl md:text-6xl text-slate-900 leading-tight mb-4"
          style={fontStyles.playfair}
        >
          <span className="block">Let's add those captions</span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
            to your video
          </span>
        </h1>
        <p className="text-slate-500 text-lg font-medium tracking-wide uppercase opacity-80">
          Witness Quill's magic
        </p>
      </div>
      <div className="w-full max-w-[760px] bg-white rounded-3xl shadow-2xl overflow-hidden min-h-[405px] flex flex-col relative">
        {showRenderedVideo && renderedVideoUrl ? (
          <div className="flex-1 flex flex-col">
            <video
              src={renderedVideoUrl}
              controls
              className="w-full h-full bg-black object-contain"
            />
          </div>
        ) :
          (
            <div className="flex-1 p-8 flex flex-col items-center justify-center">
              <div
                {...getRootProps()}
                className={clsx(
                  'w-full min-w-[700px] max-w-lg aspect-video rounded-2xl max-h-[405px] border-[3px] border-dashed transition-all duration-300 flex flex-col items-center justify-center cursor-pointer group',
                  isDragActive
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-slate-200 bg-slate-50 hover:border-purple-300 hover:bg-slate-100',
                  state !== 'IDLE' && 'pointer-events-none opacity-50',
                )}
              >
                <input {...getInputProps()} />

                {state === 'IDLE' && (
                  <>
                    <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-8 h-8 text-purple-500" />
                    </div>
                    <p className="text-lg font-semibold text-slate-700">Drop your MP4 here</p>
                    <p className="text-sm text-slate-400 mt-2">Max size 35MB</p>
                  </>
                )}

                {isBusy && (
                  <div className="flex flex-col items-center animate-pulse">
                    <Loader2 className="w-10 h-10 text-purple-600 animate-spin mb-4" />
                    <p className="text-lg font-medium text-slate-700">
                      {state === 'UPLOADING'
                        ? 'Uploading video...'
                        : state === 'GENERATING'
                          ? 'Generating captions...'
                          : 'Rendering final video...'}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">This might take a moment</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}
            </div>
          )}
      </div>

      {renderedVideoUrl ? ( // Check for URL instead of blob
        <div className="p-6 border-t border-slate-100 flex gap-4 justify-center">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try different file
          </button>
          
          {/* Download SRT button */}
          <button
            onClick={handleDownloadSrt}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download SRT
          </button>
          
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition-all shadow-lg shadow-purple-200"
          >
            <Download className="w-4 h-4" />
            Download Video
          </button>
        </div>
      ) : null}
    </main>
  );
}