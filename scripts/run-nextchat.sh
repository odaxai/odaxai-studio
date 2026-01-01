#!/bin/bash

# OdaxAI - Run NextChat (localhost:3002)
# For development/testing the chat interface

echo "💬 Starting NextChat (localhost:3002)..."
echo "   Complete AI chat interface"
echo ""

cd "$(dirname "$0")/../services/NextChat"  # Go to NextChat directory

# Check if port is already in use
if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "ℹ️  Port 3002 already in use (probably from macOS app)"
    echo "🌐 Opening existing NextChat in browser..."
    open http://localhost:3002
    echo ""
    echo "✅ NextChat: http://localhost:3002 (existing instance)"
    echo "   Changes automatically reflect in macOS app!"
    exit 0
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing NextChat dependencies..."
    yarn install --no-audit --no-fund
fi

# Start NextChat
echo "🚀 Starting NextChat on port 3002..."
PORT=3002 yarn run dev &

# Wait for server to be ready
echo "⏳ Waiting for NextChat..."
for i in {1..15}; do
    if curl -s http://localhost:3002 > /dev/null 2>&1; then
        echo "✅ NextChat ready!"
        break
    fi
    sleep 1
done

# Open in browser
echo "🌐 Opening in browser..."
open http://localhost:3002

echo ""
echo "✅ NextChat: http://localhost:3002"
echo "   Changes automatically reflect in macOS app!"
