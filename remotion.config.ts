// remotion.config.ts

import { Config } from '@remotion/cli/config';

/**
 * Configure your Remotion project.
 * The primary purpose here is to tell Remotion where to find the static files
 * (your video uploads) during the server-side render.
 */

(Config as any).setVideoConfig({
    // This tells Remotion where your static files live
    /* 
      staticDir is relative to the project root.
      'public' means everything in the /public folder will be accessible at /
    */
    staticDir: 'public'
});
