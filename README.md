# Quill: AI-Powered Video Captioning Renderer

Quill is an application built with Next.js, React, and Remotion that automates the process of transcribing speech from uploaded videos (MP4) and rendering a new video file with dynamic, karaoke-style captions burned directly into the footage.

[Demo Video](https://drive.google.com/file/d/1z9DrLnEEXpIGpRIqixxBjQvSOhF-MTIP/view?usp=share_link)

[Generated Video from demo](https://drive.google.com/file/d/1j5MOOOqwI-WC50MrIk6rIiBB-fiBmRoj/view?usp=share_link)

[Generated .srt file from demo](https://drive.google.com/file/d/1CojY-LNPpqC47ucfX8Ao1_m51nCtVmyR/view?usp=share_link)

## Prerequisites & Setup

This project requires a specific version of Node.js and uses an external transcription service for the caption generation pipeline.

### Node.js Version

It is highly recommended to use Node.js v18.x or Node.js v20.x.

To ensure you are using the correct version, you can use Node Version Manager (NVM):

```
# Check your current version
node -v

# Use nvm to switch to Node 18 (or 20)
nvm use 18
```

## Running Locally

Follow these steps to set up and run the project on your local machine.

1. **Install Dependencies:**

```
npm install
```

2. Start the Development Server:

```
npm run dev
```

The application will now be accessible at `http://localhost:3000`.

## Folder Structure

The project follows a standard Next.js app directory structure, with key logic separated into specific directories:

```
.
├── src/
│   ├── app/                      # Next.js App Router for routing and API routes
│   │   ├── api/                  # Backend API endpoints
│   │   │   ├── transcribe/       # Handles audio transcription request
│   │   │   └── render/           # Handles video rendering request via Remotion
│   │   └── page.tsx              # Main UI component (where video upload/state lives)
│   ├── components/
│   │   ├── captions/             # Components specific to caption display (CaptionDisplay.tsx)
│   │   └── ...                   # Other UI components
│   ├── lib/                      # Helper utilities and non-UI logic
│   │   ├── client/ffmpeg/        # Client-side video processing (WAV extraction)
│   │   └── captions.ts           # Logic for parsing SRT to Remotion format
│   ├── remotion/                 # Remotion-specific files (Composition and components)
│   │   ├── Root.tsx              # The main entry point for Remotion
│   │   ├── index.tsx             # Defines compositions and sets up the Remotion player
│   │   └── CaptionComposition.tsx# Component that layers captions over the video (Crucial for styling)
│   └── types/                    # TypeScript definitions
└── package.json                  # Project dependencies and scripts
```

## Caption Generation Method Details

The application uses a three-stage pipeline to generate the final captioned video:

1.** Audio Extraction (Client-Side/FFmpeg):**

    - The user uploads an MP4 video file in 'src/app/page.tsx'.

    - The 'extractWavFromVideo' function (using an FFmpeg library like 'ffmpeg.wasm') extracts the raw audio track from the video and converts it into a high-quality '.wav' audio file.

2. **Transcription (API Route):**

    - The audio file is sent to the '/api/transcribe' endpoint.

    - This API route communicates with a third-party speech-to-text service (e.g., Deepgram, OpenAI Whisper).

    - The service returns the transcription data, which is formatted as an **SRT (SubRip Text)** file containing **word-level timestamps**.

    - The 'srtToCaptionPages' helper function then parses this SRT data into a structure suitable for Remotion, organizing captions by "page" (screen duration) and "tokens" (individual words with start/end times).

3. **Rendering (Server-Side Remotion):**

    - The original video file, the generated SRT string, and composition data are sent to the '/api/render' endpoint.

    - This endpoint uses Remotion's Node.js rendering capabilities (likely 'renderMedia()') to execute the composition defined in src/remotion/Root.tsx.

    - The 'CaptionComposition.tsx' component uses the parsed token data to render each word dynamically. The word's color changes based on the 'progress' through the word's timestamp, creating the visual "karaoke" effect.

    - The final video is returned as an MP4 blob for the user to preview and download.

## Hosting and Deployment

Since video rendering is performed server-side (within your Next.js API routes), the primary consideration for deployment is the compute power and time limits of your hosting platform.

Serverless Platforms (Vercel, Netlify): Deploying the Next.js application to Vercel or similar platforms is straightforward. However, you must be aware of the function duration limits (often 10–60 seconds). For longer videos, rendering may time out.

Dedicated Server / VPS: For robust, long-form video rendering, hosting the application on a platform with dedicated resources or longer execution limits (like a Virtual Private Server or a dedicated Node.js service) is recommended to prevent timeouts during the CPU-intensive rendering process.
