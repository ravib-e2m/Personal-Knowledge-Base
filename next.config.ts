import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empty turbopack config to acknowledge we're using Turbopack
  turbopack: {},
  
  // Webpack config for PDF.js compatibility
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize canvas and PDF.js worker for server-side
      config.externals = config.externals || [];
      config.externals.push('canvas');
    }
    
    // Handle PDF.js worker
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias.canvas = false;
    
    return config;
  },
};

export default nextConfig;
