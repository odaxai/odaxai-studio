#!/bin/bash

# OdaxAI IDE Setup Script
# Installs code-server and configures for OdaxAI Studio

set -e

echo "🚀 Setting up OdaxAI IDE..."

# Check if code-server is installed
if ! command -v code-server &> /dev/null; then
    echo "📦 Installing code-server..."
    
    # Check OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install code-server
        else
            echo "❌ Homebrew not found. Please install from: https://brew.sh"
            echo "Or install code-server manually: https://github.com/coder/code-server"
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        curl -fsSL https://code-server.dev/install.sh | sh
    else
        echo "❌ Unsupported OS: $OSTYPE"
        echo "Please install code-server manually: https://github.com/coder/code-server"
        exit 1
    fi
else
    echo "✅ code-server is already installed"
fi

# Determine script directory to allow running from root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
IDE_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$IDE_ROOT"

echo "📂 Working directory: $(pwd)"

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p config data extensions

# Generate config file
echo "⚙️  Generating configuration..."
cat > config/config.yaml << EOF
bind-addr: 127.0.0.1:8080
auth: none
password: 
cert: false
disable-telemetry: true
disable-update-check: true
user-data-dir: $(pwd)/data
extensions-dir: $(pwd)/extensions
EOF

# Install Extensions
echo "🧩 Installing extensions..."
if command -v code-server &> /dev/null; then
    # Try to install llama.vscode (assuming it's on the marketplace or we might need to build it)
    # Using generic ID or URL if known. For now, we'll try the likely ID.
    echo "Installing llama.vscode..."
    # Note: If this fails, we might need a direct VSIX download.
    # We will log but not fail the script if an extension is missing.
    code-server --extensions-dir $(pwd)/extensions --install-extension ggml-org.llama-vscode || echo "⚠️ Could not install llama.vscode from marketplace. You may need to install the VSIX manually."
    
    # Install Prettier
    code-server --extensions-dir $(pwd)/extensions --install-extension esbenp.prettier-vscode
    
    # Install Theme (e.g. GitHub Dark to match Cursor/Odax slightly better than default)
    code-server --extensions-dir $(pwd)/extensions --install-extension github.github-vscode-theme
else
     echo "⚠️ code-server not in PATH, skipping extension install."
fi

echo "✅ OdaxAI IDE setup complete!"
echo ""
echo "Next steps:"
echo "  1. Run 'pnpm run start:ide' to start code-server"
echo "  2. Access at http://localhost:8080"
echo "  3. The IDE will be available in OdaxAI Studio at /ide"

