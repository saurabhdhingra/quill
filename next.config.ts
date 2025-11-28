import type { NextConfig } from "next";

const nextConfig = {
  // We need to configure webpack to ensure Next.js does not bundle 
  // Remotion's native dependencies, as we are using Remotion Lambda (serverless) 
  // and do not require local rendering binaries.
  webpack: (config, { isServer }) => {
    // Only apply externalization logic during server-side compilation
    if (isServer) {
      // 1. Mark native Remotion and related tools as external.
      // This prevents the Next.js Webpack from processing Node-specific and 
      // internal Remotion dependencies, which causes the React.createContext error.
      config.externals.push(
        // Remotion Compositor dependencies (already there)
        /@remotion\/compositor-(.*)/, 
        // Other dependencies being bundled unexpectedly (already there)
        'prettier',
        // FIX: Externalize esbuild (already there)
        'esbuild',
        // FIX: Externalize recast and babylon (already there)
        'recast',
        'babylon',
        // CRITICAL FIX: Externalize Remotion's internal bundler and related React-touching packages.
        '@remotion/bundler',
        'webpack',
        'fs-extra', // Often causes issues when bundled
        'bufferutil', // Node-native utilities
        'utf-8-validate' // Node-native utilities
      );
      
      // 2. Add a rule to handle problematic file types (like .md and native binaries) 
      // found inside packages like @esbuild, preventing 'Unknown module type' and 
      // 'failed to convert rope into string' errors.
      config.module.rules.push({
        test: /\.(md|bin|dat|node)$/,
        use: 'raw-loader', // Treat these files as raw content, not JS modules.
      });
    }

    return config;
  },
};

export default nextConfig;
