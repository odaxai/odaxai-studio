#!/bin/bash

# ──────────────────────────────────────────────────────────────
# OdaxAI Studio
# Copyright © 2026 OdaxAI SRL. All rights reserved.
# Licensed under the PolyForm Noncommercial License 1.0.0
# ──────────────────────────────────────────────────────────────

# Post-build obfuscation script for OdaxStudio
# This script obfuscates the production JavaScript files

set -e

echo "🛡️ Advanced Code Obfuscation"
echo "============================="

BUILD_DIR="apps/web/.next/static/chunks"

if [ ! -d "$BUILD_DIR" ]; then
    echo "❌ Build directory not found. Run 'npm run build' first."
    exit 1
fi

echo "📦 Installing javascript-obfuscator..."
npm install -g javascript-obfuscator 2>/dev/null || true

echo "🔒 Obfuscating JavaScript files..."

# Find and obfuscate all JS files in chunks
find "$BUILD_DIR" -name "*.js" -type f | while read file; do
    echo "  Processing: $(basename "$file")"
    npx javascript-obfuscator "$file" \
        --output "$file" \
        --compact true \
        --control-flow-flattening true \
        --control-flow-flattening-threshold 0.5 \
        --dead-code-injection true \
        --dead-code-injection-threshold 0.2 \
        --string-array true \
        --string-array-encoding base64 \
        --string-array-threshold 0.5 \
        --unicode-escape-sequence true \
        2>/dev/null || echo "    (skipped - may be too large)"
done

echo ""
echo "✅ Obfuscation complete!"
echo "   JavaScript files are now heavily obfuscated."
