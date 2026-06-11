import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Externalize pdf-parse and its dependencies so the bundler does NOT try
  // to resolve pdfjs-dist worker files (which fails under Turbopack).
  // These packages will be loaded via Node.js require() at runtime instead.
  serverExternalPackages: [
    'pdf-parse',
    'pdfjs-dist',
    'canvas',
    '@napi-rs/canvas',
  ],

  // Turbopack config
  turbopack: {},

  // Webpack config for compatibility
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('canvas');
      config.externals.push('@napi-rs/canvas');
    }

    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias.canvas = false;

    return config;
  },
};

export default nextConfig;
