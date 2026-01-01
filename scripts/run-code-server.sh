#!/bin/bash

# OdaxAI - Run Code Server (localhost:8080)
# For development/testing VS Code in browser

echo "💻 Starting Code Server (localhost:8080)..."
echo "   Complete VS Code in browser with llama.vscode"
echo ""

cd "$(dirname "$0")/.."  # Go to project root

# Check if code-server is installed
if ! command -v code-server &> /dev/null; then
    echo "❌ code-server not found. Install with: brew install code-server"
    exit 1
fi

# Setup VS Code configuration
echo "⚙️  Configuring VS Code..."
USER_DATA_DIR="$PWD/.odax/code-server/data"
EXT_DIR="$PWD/.odax/code-server/extensions_isolated"
mkdir -p "$USER_DATA_DIR/User" "$EXT_DIR"

# Copy configuration files
cp "apps/macos/config/code-server-settings.json" "$USER_DATA_DIR/User/settings.json" 2>/dev/null || true
cp "apps/macos/config/keybindings.json" "$USER_DATA_DIR/User/keybindings.json" 2>/dev/null || true
cp "apps/macos/config/custom.css" "$USER_DATA_DIR/User/globalStorage/custom.css" 2>/dev/null || true
cp "apps/macos/config/product.json" "$USER_DATA_DIR/product.json" 2>/dev/null || true
cp "apps/macos/config/argv.json" "$USER_DATA_DIR/argv.json" 2>/dev/null || true

# Install llama.vscode
LLAMA_EXT_SOURCE="apps/ide/extensions/ggml-org.llama-vscode-0.0.37-universal"
LLAMA_EXT_TARGET="$EXT_DIR/ggml-org.llama-vscode-0.0.37"

if [ -d "$LLAMA_EXT_SOURCE" ]; then
    echo "🧠 Installing llama.vscode..."
    rm -rf "$LLAMA_EXT_TARGET"
    cp -R "$LLAMA_EXT_SOURCE" "$LLAMA_EXT_TARGET"
    echo "✅ llama.vscode installed"
fi

# Clean up unwanted extensions
echo "🧹 Removing unwanted extensions..."
rm -rf "$HOME/.local/share/code-server/extensions/github.copilot"* 2>/dev/null || true
rm -rf "$HOME/.local/share/code-server/extensions/coder"* 2>/dev/null || true

# Check if port is already in use
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "ℹ️  Port 8080 already in use (probably from macOS app)"
    echo "🌐 Opening existing code-server in browser..."
    open http://localhost:8080
    echo ""
    echo "✅ Code Server: http://localhost:8080 (existing instance)"
    echo "   Changes automatically reflect in macOS app!"
    exit 0
fi

# Start code-server
echo "🚀 Starting code-server..."
code-server \
    --bind-addr 127.0.0.1:8080 \
    --auth none \
    --disable-telemetry \
    --disable-update-check \
    --disable-workspace-trust \
    --disable-file-downloads \
    --user-data-dir "$USER_DATA_DIR" \
    --extensions-dir "$EXT_DIR" \
    --ignore-last-opened \
    "$PWD" &

# Wait for server to be ready
echo "⏳ Waiting for code-server..."
for i in {1..10}; do
    if curl -s http://localhost:8080 > /dev/null 2>&1; then
        echo "✅ Code Server ready!"
        break
    fi
    sleep 1
done

# Open in browser
echo "🌐 Opening in browser..."
open http://localhost:8080

echo ""
echo "✅ Code Server: http://localhost:8080"
echo "   Changes automatically reflect in macOS app!"
