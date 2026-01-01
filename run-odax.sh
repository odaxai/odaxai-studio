#!/bin/bash

# OdaxAI Studio - All-in-One Runner
# Setup and Start the Unified Desktop Experience (macOS)

set -e

echo "🚀 Initializing OdaxAI Studio..."

# 1. Check/Install Dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies (pnpm)..."
    pnpm install
fi

# 2. Detect Platform
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 Detected macOS - Starting Native App with code-server + llama.vscode"
    echo ""
    echo "🎨 Features:"
    echo "  ✓ code-server (VS Code in browser)"
    echo "  ✓ llama.vscode (Local AI)"
    echo "  ✓ Full Black Theme"
    echo "  ✓ Clean Menus (no GitHub/Copilot)"
    echo ""
    
    # Run macOS native app
    cd apps/macos
    chmod +x scripts/run.sh
    exec ./scripts/run.sh
else
    echo "🐧 Detected Linux/Windows - Starting Desktop App"
    
    # Setup IDE Layer (code-server & extensions)
    echo "🛠️  Setting up IDE Layer..."
    chmod +x apps/ide/scripts/setup.sh
    ./apps/ide/scripts/setup.sh
    
    # Start the Desktop App (Local Engine)
    echo "🖥️  Starting OdaxAI Desktop App..."
    echo "   (This will spawn the Web UI and IDE Backend automatically)"
    cd apps/desktop && pnpm run dev
fi
