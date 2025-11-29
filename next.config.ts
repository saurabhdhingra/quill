const nextConfig = {
  // 1. TURBOPACK/CLIENT-SIDE FIX
  experimental: {
    appDir: true,
    serverComponentsExternalPackages: ["@remotion/ffmpeg", "@ffmpeg/ffmpeg", "@ffmpeg/util"],
    // Explicitly disabling Turbopack in development to ensure Webpack is used for Remotion's custom bundling needs.
    isRSC: false, 
  },
  
  // 2. SERVER-SIDE EXTERNALIZATION FIX (Prevents bundling Node-native code used by Remotion Lambda)
  webpack: (config, { isServer }) => {
    // Only apply externalization logic during server-side compilation
    if (isServer) {
      // Ensure the externals array is initialized
      if (!config.externals) {
        config.externals = [];
      }
      
      // Mark native Remotion and related tools as external.
      config.externals.push(
        // Remotion Compositor dependencies
        /@remotion\/compositor-(.*)/, 
        // Core dependencies often bundled by mistake
        'prettier',
        'esbuild',
        'recast',
        'babylon',
        // Critical packages that must remain external in a serverless environment
        '@remotion/bundler',
        'webpack',
        'fs-extra', 
        'bufferutil', 
        'utf-8-validate', 
      );
      
      // Add a rule to handle problematic file types (like .md and native binaries)
      config.module.rules.push({
        test: /\.(md|bin|dat|node)$/,
        use: 'raw-loader', // Requires 'raw-loader' to be installed (npm install raw-loader)
      });
      
      // Ensure Node-specific file system modules are properly handled/ignored
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false, 
        path: false, 
        os: false, 
      };
    }

    return config;
  },
};

module.exports = nextConfig;