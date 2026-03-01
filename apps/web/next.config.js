// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@odax/ui',
    '@odax/types',
    '@odax/db',
    'cheerio',
    'undici',
  ],

  // Skip TypeScript/ESLint errors in production build
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // 🛡️ PRODUCTION PROTECTION - Anti Reverse Engineering
  productionBrowserSourceMaps: false, // No source maps in production

  // SWC Minification with aggressive settings
  swcMinify: true,

  compiler: {
    // Remove console.log in production
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
  },

  // Webpack optimization for maximum obfuscation
  webpack: (config, { isServer, dev }) => {
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
      };
    }
    // Ignore native .node modules and server-only packages
    config.externals = [
      ...(config.externals || []),
      { '@lancedb/lancedb': '@lancedb/lancedb' },
      { 'pdf-parse': 'pdf-parse' },
    ];
    return config;
  },

  // Server-side only packages (native modules)
  experimental: {
    serverComponentsExternalPackages: ['@lancedb/lancedb', 'pdf-parse'],
  },

  // Enable CORS for API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, DELETE, OPTIONS',
          },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: '/ide/:path*',
        destination: 'http://localhost:8080/:path*', // Proxy to code-server
      },
    ];
  },
};

module.exports = nextConfig;
