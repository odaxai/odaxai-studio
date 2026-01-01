#!/bin/bash

# OdaxAI - Run Perplexica (localhost:3001)
# For development/testing the search interface

echo "🔍 Starting Perplexica (localhost:3001)..."
echo "   AI-powered search engine"
echo ""

cd "$(dirname "$0")/../services/Perplexica"  # Go to Perplexica directory

# Check if port is already in use
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "ℹ️  Port 3001 already in use (probably from macOS app)"
    echo "🌐 Opening existing Perplexica in browser..."
    open http://localhost:3001
    echo ""
    echo "✅ Perplexica: http://localhost:3001 (existing instance)"
    echo "   Changes automatically reflect in macOS app!"
    exit 0
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Perplexica dependencies..."
    npm install --no-audit --no-fund
fi

# Check if build exists
if [ ! -d ".next" ]; then
    echo "🔨 Building Perplexica..."
    npm run build
fi

# Start Perplexica
echo "🚀 Starting Perplexica on port 3001..."
PORT=3001 npm run dev &

# Wait for server to be ready
echo "⏳ Waiting for Perplexica..."
for i in {1..20}; do
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        echo "✅ Perplexica ready!"
        break
    fi
    sleep 1
done

# Open in browser
echo "🌐 Opening in browser..."
open http://localhost:3001

echo ""
echo "✅ Perplexica: http://localhost:3001"
echo "   Changes automatically reflect in macOS app!"
