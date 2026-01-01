#!/bin/bash

# OdaxAI - Run Web Interface (localhost:3000)
# For development/testing the main web interface

echo "🌐 Starting Web Interface (localhost:3000)..."
echo "   Main interface with chat, IDE, search"
echo ""

cd "$(dirname "$0")/.."  # Go to project root

# Check if port is already in use
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "ℹ️  Port 3000 already in use (probably from macOS app)"
    echo "🌐 Opening existing web interface in browser..."
    open http://localhost:3000
    echo ""
    echo "✅ Web Interface: http://localhost:3000 (existing instance)"
    echo "   - Odax Chat → NextChat (port 3002)"
    echo "   - VS Code IDE → code-server (port 8080)"
    echo "   - Search → Perplexica (port 3001)"
    exit 0
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Start web interface
echo "🚀 Starting Next.js web app..."
pnpm run start:web &

# Wait for server to be ready
echo "⏳ Waiting for web interface..."
for i in {1..10}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Web Interface ready!"
        break
    fi
    sleep 1
done

# Open in browser
echo "🌐 Opening in browser..."
open http://localhost:3000

echo ""
echo "✅ Web Interface: http://localhost:3000"
echo "   - Odax Chat → NextChat (port 3002)"
echo "   - VS Code IDE → code-server (port 8080)"
echo "   - Search → Perplexica (port 3001)"
