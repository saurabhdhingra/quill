'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Loader2, UploadCloud, RefreshCw, Download } from 'lucide-react';

// FIREBASE IMPORTS (REQUIRED FOR STORAGE AND AUTH)
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
// Firestore is imported but not used, kept for completeness in standard Firebase pattern
import { getFirestore } from 'firebase/firestore'; 

// Utility for merging class names (defined here to avoid external import error)
const clsx = (...args) => args.filter(Boolean).join(' ');

// Mock Font Styles (Required since Next.js Font imports are not available here)
const fontStyles = {
  playfair: { fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' },
  inter: { fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif' }
};

// Mock Types
// AssemblyAI/Whisper output structure for a word
interface AssemblyAIWord {
  text: string;
  start: number; // in ms
  end: number;   // in ms
  confidence: number;
  speaker: string | null;
}


// --- FIREBASE INITIALIZATION & HOOKS ---

function useFirebaseInit() {
  const [auth, setAuth] = useState(null);
  const [storage, setStorage] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    try {
      // Accessing global variables provided by the environment
      const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
      
      if (Object.keys(firebaseConfig).length === 0) {
        // Fallback for environment without config
        throw new Error("Firebase config not found.");
      }

      const app = initializeApp(firebaseConfig);
      const authInstance = getAuth(app);
      const storageInstance = getStorage(app);

      setAuth(authInstance);
      setStorage(storageInstance);

      // 1. Handle authentication
      const authenticate = async () => {
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        
        try {
          if (initialAuthToken) {
            await signInWithCustomToken(authInstance, initialAuthToken);
          } else {
            // Sign in anonymously if no token is available
            await signInAnonymously(authInstance);
          }
        } catch (authError) {
          console.error("Firebase Auth Error:", authError);
          // Fallback to anonymous sign-in if custom token fails
          await signInAnonymously(authInstance);
        }
      };

      // 2. Set up Auth State Listener
      const unsubscribe = onAuthStateChanged(authInstance, (user) => {
        if (user) {
          setUserId(user.uid);
          setIsReady(true);
        } else {
          // If no user, try to sign in
          authenticate();
        }
      });
      
      return () => unsubscribe();
    } catch (e) {
      console.error("Failed to initialize Firebase:", e);
      setIsReady(true); // Treat as ready but failed
    }
  }, []);

  return { storage, userId, isReady };
}

// --- REMOTION MOCKS & COMPOSITION ---

const useVideoConfig = () => ({ fps: 30 });
// Mock useCurrentFrame to drive the animation loop
const useCurrentFrame = () => {
    const [frame, setFrame] = useState(0);
    const frameRef = useRef(0);
    const { fps } = useVideoConfig();

    // Mock loop for 30 seconds
    const maxFrames = 30 * fps; 

    useEffect(() => {
        const interval = setInterval(() => {
            frameRef.current = (frameRef.current + 1) % maxFrames; 
            setFrame(frameRef.current);
        }, 1000 / fps);
        return () => clearInterval(interval);
    }, [fps, maxFrames]);
    return frame;
};

// Define explicit types for Mock components
interface PlayerProps {
  component: React.FC<any>;
  inputProps: any;
  durationInFrames: number;
  compositionWidth: number;
  compositionHeight: number;
  fps: number;
  style: React.CSSProperties;
  controls: boolean;
}
interface AbsoluteFillProps {
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}
interface OffthreadVideoProps {
    src: string;
    className?: string;
}

const AbsoluteFill: React.FC<AbsoluteFillProps> = ({ children, className, style }) => (
    <div className={className} style={{ ...style, position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        {children}
    </div>
);

const OffthreadVideo: React.FC<OffthreadVideoProps> = ({ src, className }) => (
    <video 
        key={src} // Key ensures the video element reloads when src changes
        src={src} 
        className={className} 
        loop 
        muted 
        playsInline 
        autoPlay 
        onError={(e) => console.error("Video element error:", e.currentTarget.error)}
    />
);

// Caption Rendering Logic within the composition mock
const MockCaption = ({ captions }) => {
    const { fps } = useVideoConfig();
    const frame = useCurrentFrame();
    const currentTimeInMs = (frame / fps) * 1000;

    const activeWord = captions.find(
        (word) => currentTimeInMs >= word.start && currentTimeInMs <= word.end
    );
    
    return (
        <div className="flex justify-center w-full">
            <div className="px-6 py-4 rounded-xl bg-black/60 backdrop-blur-sm transition-all duration-200">
                <h1 
                className="text-5xl font-bold text-white text-center drop-shadow-lg"
                style={{
                    ...fontStyles.inter,
                    opacity: activeWord ? 1 : 0,
                    transform: activeWord ? 'scale(1)' : 'scale(0.95)',
                    transition: 'all 0.2s ease'
                }}
                >
                {activeWord?.text || '...'}
                </h1>
            </div>
        </div>
    );
};


// Remotion Composition Mock
interface CaptionCompositionProps {
    videoUrl: string;
    captions: AssemblyAIWord[];
}

const CaptionComposition: React.FC<CaptionCompositionProps> = ({ videoUrl, captions }) => {
  return (
    <AbsoluteFill className="bg-black">
      {videoUrl ? (
          <OffthreadVideo 
            src={videoUrl} 
            className="w-full h-full object-cover opacity-80" 
          />
      ) : (
          <div className="w-full h-full flex items-center justify-center text-white">No Video Source</div>
      )}
      
      <AbsoluteFill className="flex items-center justify-end pb-24 flex-col">
        <MockCaption captions={captions} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Mock Player component
const Player: React.FC<PlayerProps> = ({ component: Component, inputProps, durationInFrames, compositionWidth, compositionHeight, fps, style, controls }) => {
    const frame = useCurrentFrame();
    return (
        <div style={{ ...style, position: 'relative', overflow: 'hidden', backgroundColor: 'black' }}>
            <Component {...inputProps} />
            {controls && (
                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent text-white text-xs flex justify-between">
                   <span>▶ Preview Playing (Mock)</span>
                   <span>Frame: {frame} / {durationInFrames}</span>
                </div>
            )}
        </div>
    );
};

// --- APP LOGIC ---

type AppState = 'IDLE' | 'UPLOADING' | 'GENERATING' | 'READY' | 'ERROR';

export default function Home() {
  const { storage, userId, isReady: firebaseReady } = useFirebaseInit();
  const [state, setState] = useState<AppState>('IDLE');
  const [videoFile, setVideoFile] = useState(null);
  const [localVideoUrl, setLocalVideoUrl] = useState(null); // URL.createObjectURL for fast preview
  const [publicVideoUrl, setPublicVideoUrl] = useState(null); // Download URL for Remotion Lambda/STT
  const [captions, setCaptions] = useState<AssemblyAIWord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

  // Cleanup local URL on component unmount or file change
  useEffect(() => {
    return () => {
      if (localVideoUrl) URL.revokeObjectURL(localVideoUrl);
    };
  }, [localVideoUrl]);

  const uploadVideo = useCallback(async (file) => {
    if (!storage || !userId) {
      throw new Error("Storage or User ID not available for upload.");
    }

    // Path structure: /artifacts/{appId}/users/{userId}/videos/{filename_timestamp}
    const storagePath = `artifacts/${appId}/users/${userId}/videos/${file.name}_${Date.now()}`;
    const fileRef = storageRef(storage, storagePath);
    
    const uploadTask = uploadBytesResumable(fileRef, file);
    
    // Listen for state changes, errors, and completion of the upload.
    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload is ' + progress.toFixed(0) + '% done');
                // You could update a state variable for a progress bar here
            }, 
            (uploadError) => {
                console.error("Upload failed:", uploadError);
                reject(uploadError);
            }, 
            async () => {
                // Upload completed successfully, now get the public URL
                try {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve(downloadURL);
                } catch (urlError) {
                    console.error("Failed to get download URL:", urlError);
                    reject(urlError);
                }
            }
        );
    });

  }, [storage, userId, appId]);

  const processFile = useCallback(async (file) => {
    if (!firebaseReady) {
        setError("Firebase connection not ready. Please wait a moment.");
        return;
    }

    // 1. Set File & Instant Local Preview
    setVideoFile(file);
    const tempUrl = URL.createObjectURL(file); 
    setLocalVideoUrl(tempUrl);
    setCaptions([]);
    setError(null);
    setState('UPLOADING');

    try {
        // 2. Upload video to storage (Actual Firebase Upload)
        const publicUrl = await uploadVideo(file);
        setPublicVideoUrl(publicUrl);
        console.log("Video uploaded successfully to:", publicUrl);

        // 3. Start Transcription (Mocked for now as we don't have the API endpoint)
        setState('GENERATING');
        console.log("Fetching captions using public URL (STT MOCK)...");
        
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        // Mock Captions
        const mockCaptions: AssemblyAIWord[] = [
            { text: "Witness", start: 0, end: 500, confidence: 0.9, speaker: "A" },
            { text: "Quill's", start: 500, end: 1000, confidence: 0.9, speaker: "A" },
            { text: "Magic", start: 1000, end: 1500, confidence: 0.9, speaker: "A" },
            { text: "In", start: 1500, end: 2000, confidence: 0.9, speaker: "A" },
            { text: "Action", start: 2000, end: 2500, confidence: 0.9, speaker: "A" },
            { text: "Right", start: 2500, end: 3000, confidence: 0.9, speaker: "A" },
            { text: "Now", start: 3000, end: 3500, confidence: 0.9, speaker: "A" },
            { text: "Let's get started.", start: 3500, end: 6000, confidence: 0.9, speaker: "A" },
        ];
        setCaptions(mockCaptions);
        setState('READY');

    } catch (e) {
        console.error("Processing Error:", e);
        setError(`Failed to process video: ${e.message}`);
        setState('ERROR');
    }
  }, [firebaseReady, uploadVideo]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    processFile(file); 
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/mp4': ['.mp4'] },
    maxSize: 35 * 1024 * 1024,
    maxFiles: 1,
    disabled: state !== 'IDLE',
  });

  const handleReset = () => {
    // Revoke the object URL to clean up memory
    if (localVideoUrl) URL.revokeObjectURL(localVideoUrl);

    setState('IDLE');
    setVideoFile(null);
    setLocalVideoUrl(null);
    setPublicVideoUrl(null);
    setCaptions([]);
    setError(null);
  };

  const handleDownload = () => {
    if (!publicVideoUrl || state !== 'READY') {
      // Use custom modal UI instead of alert()
      const message = document.createElement('div');
      message.textContent = "Video must be processed and captions generated before initiating download.";
      message.className = "fixed top-4 right-4 bg-yellow-600 text-white p-3 rounded-lg shadow-xl z-50 transition-opacity duration-300";
      document.body.appendChild(message);
      setTimeout(() => { message.remove(); }, 3000);
      return;
    }
    
    // In a real app, this would initiate the Remotion render/download
    console.log("Initiating Remotion Render with public URL:", publicVideoUrl);
    const downloadMessage = document.createElement('div');
    downloadMessage.textContent = "Mock download triggered. Remotion render job started in the background.";
    downloadMessage.className = "fixed top-4 right-4 bg-blue-600 text-white p-3 rounded-lg shadow-xl z-50 transition-opacity duration-300";
    document.body.appendChild(downloadMessage);
    setTimeout(() => { downloadMessage.remove(); }, 3000);
  };

  const isProcessing = state !== 'IDLE' && state !== 'READY' && state !== 'ERROR';
  const processingMessage = 
    state === 'UPLOADING' ? 'Uploading video to GCP Storage...' : 
    state === 'GENERATING' ? 'Generating captions (STT MOCK)...' : 
    'Loading...';

  const isDownloadEnabled = state === 'READY' && publicVideoUrl;
  const isResetEnabled = state !== 'IDLE';


  return (
    <main className={clsx(
      "min-h-screen flex flex-col items-center p-6",
      "bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50"
    )} style={fontStyles.inter}>
      
      {/* Title Area */}
      <div className="text-center mt-6 mb-8 max-w-2xl flex-shrink-0">
        <h1 className="text-4xl md:text-5xl text-slate-900 leading-tight mb-3" style={fontStyles.playfair}>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">
            Automated Video Captioning
          </span>
        </h1>
        <p className="text-slate-500 text-base font-medium tracking-wide">
          Upload MP4 to start the real Firebase upload and caption generation workflow.
        </p>
        <p className="text-xs text-slate-400 mt-2">
          User ID: {userId || (firebaseReady ? 'Anonymous' : 'Authenticating...')}
        </p>
      </div>

      {/* Main Content Area (Attempts to fill remaining space) */}
      <div className="w-full max-w-[900px] flex-grow flex flex-col items-center justify-center">
        <div className="w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
          
          {/* Top Panel: Player or Dropzone */}
          <div className="flex-1 min-h-[400px] flex items-center justify-center">
            {(state === 'READY' || isProcessing || localVideoUrl) ? (
              <div className="flex-1 relative bg-black h-full py-4">
                <div className="aspect-[9/16] max-w-sm mx-auto h-full">
                    <Player
                      component={CaptionComposition}
                      inputProps={{
                        videoUrl: localVideoUrl,
                        captions: captions.length > 0 ? captions : [{ text: 'Uploading...', start: 0, end: 10000, confidence: 1, speaker: 'A' }],
                      }}
                      durationInFrames={1800}
                      compositionWidth={1080}
                      compositionHeight={1920}
                      fps={30}
                      style={{
                        width: '100%',
                        height: '100%',
                      }}
                      controls
                    />
                </div>
              </div>
            ) : (
              <div className="flex-1 p-8 flex flex-col items-center justify-center">
                <div 
                  {...getRootProps()} 
                  className={clsx(
                    "w-full max-w-md aspect-video rounded-2xl border-[3px] border-dashed p-4 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer group",
                    isDragActive ? "border-purple-500 bg-purple-50" : "border-slate-200 bg-slate-50 hover:border-purple-300 hover:bg-slate-100",
                    isProcessing && "pointer-events-none opacity-50"
                  )}
                >
                  <input {...getInputProps()} />
                  
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-6 h-6 text-purple-500" />
                  </div>
                  <p className="text-lg font-semibold text-slate-700">Drop your MP4 here</p>
                  <p className="text-sm text-slate-400 mt-1">Max size 35MB</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Panel: Status and Actions */}
          <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 flex-shrink-0">
            
            {/* Status Message */}
            <div className="flex-1 w-full md:w-auto">
                {error ? (
                    <p className="text-red-600 font-semibold flex items-center gap-2">
                        <Loader2 className="w-4 h-4" /> {error}
                    </p>
                ) : isProcessing ? (
                    <p className="text-purple-600 font-semibold flex items-center gap-2 animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin" /> {processingMessage}
                    </p>
                ) : state === 'READY' ? (
                    <p className="text-green-600 font-semibold">
                        ✅ Captions Generated. Ready for Download.
                    </p>
                ) : (
                    <p className="text-slate-500">
                        Drop a file to begin the process.
                    </p>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 flex-shrink-0 w-full md:w-auto">
                <button 
                  onClick={handleReset}
                  disabled={!isResetEnabled || isProcessing}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold transition-colors",
                    isResetEnabled && !isProcessing 
                        ? "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                        : "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                  )}
                >
                  <RefreshCw className="w-4 h-4" />
                  Reset
                </button>
                <button 
                  onClick={handleDownload}
                  disabled={!isDownloadEnabled}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all shadow-lg",
                    isDownloadEnabled
                        ? "bg-slate-900 text-white hover:bg-slate-800 shadow-purple-300/50"
                        : "bg-slate-400 text-white cursor-not-allowed shadow-none"
                  )}
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}