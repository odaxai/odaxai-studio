// ──────────────────────────────────────────────────────────────
// OdaxAI Studio
// Copyright © 2026 OdaxAI SRL. All rights reserved.
// Licensed under the PolyForm Noncommercial License 1.0.0
// ──────────────────────────────────────────────────────────────

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@lancedb/lancedb', 'pdf-parse', 'unpdf'],
  // devIndicators: false, // Deprecated in Next 15, handling via CSS if needed
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Increase upload limit for PDF parsing
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Enable WebAssembly
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // ALIASES: canvas and encoding are not needed in webpack bundles
    // pdf-parse and unpdf are excluded via serverExternalPackages (run as native Node.js)
    // so this alias only affects client-side pdfjs-dist (used for OCR fallback)
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    // Fallbacks for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // Exclude native modules from client-side bundle
    if (!isServer) {
      // ... other client specific config
      config.externals = config.externals || [];
      config.externals.push({
        '@lancedb/lancedb': 'commonjs @lancedb/lancedb',
      });
    }

    // Ignore .node files (native bindings) in webpack
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });

    // Mark LanceDB as external for server-side too if needed
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push('@lancedb/lancedb');
    }

    return config;
  },
};

module.exports = nextConfig;
