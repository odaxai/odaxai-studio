#!/bin/bash

# Script to completely disable authentication popups in code-server

echo "🔧 Disabling authentication extensions in code-server..."

# Find code-server installation
VSCODE_DIR=$(code-server --version 2>/dev/null | grep -o '/.*vscode' | head -1)

if [ -z "$VSCODE_DIR" ]; then
    # Try common installation paths
    if [ -d "/opt/homebrew/Cellar/code-server" ]; then
        VSCODE_DIR=$(find /opt/homebrew/Cellar/code-server -name "vscode" -type d | head -1)
    elif [ -d "/usr/local/lib/code-server" ]; then
        VSCODE_DIR="/usr/local/lib/code-server/lib/vscode"
    fi
fi

if [ -n "$VSCODE_DIR" ] && [ -d "$VSCODE_DIR/extensions" ]; then
    echo "Found VS Code extensions directory: $VSCODE_DIR/extensions"
    
    # Disable GitHub authentication extension
    if [ -d "$VSCODE_DIR/extensions/github-authentication" ]; then
        echo "  → Disabling github-authentication..."
        sudo mv "$VSCODE_DIR/extensions/github-authentication" "$VSCODE_DIR/extensions/github-authentication.disabled" 2>/dev/null || true
    fi
    
    # Disable Microsoft authentication extension
    if [ -d "$VSCODE_DIR/extensions/microsoft-authentication" ]; then
        echo "  → Disabling microsoft-authentication..."
        sudo mv "$VSCODE_DIR/extensions/microsoft-authentication" "$VSCODE_DIR/extensions/microsoft-authentication.disabled" 2>/dev/null || true
    fi
    
    # Disable GitHub extension (can trigger auth popups)
    if [ -d "$VSCODE_DIR/extensions/github" ]; then
        echo "  → Disabling github extension..."
        sudo mv "$VSCODE_DIR/extensions/github" "$VSCODE_DIR/extensions/github.disabled" 2>/dev/null || true
    fi

    # Disable VS Code account/auth extension variants
    if [ -d "$VSCODE_DIR/extensions/vscode-account" ]; then
        echo "  → Disabling vscode-account..."
        sudo mv "$VSCODE_DIR/extensions/vscode-account" "$VSCODE_DIR/extensions/vscode-account.disabled" 2>/dev/null || true
    fi
    if [ -d "$VSCODE_DIR/extensions/ms-vscode.vscode-account" ]; then
        echo "  → Disabling ms-vscode.vscode-account..."
        sudo mv "$VSCODE_DIR/extensions/ms-vscode.vscode-account" "$VSCODE_DIR/extensions/ms-vscode.vscode-account.disabled" 2>/dev/null || true
    fi
    
    echo "✅ Authentication extensions disabled"
else
    echo "⚠️  VS Code extensions directory not found"
    echo "   Authentication will be disabled via settings.json only"
fi

# Also create a machine settings.json to ensure settings are applied globally
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MACHINE_SETTINGS="$SCRIPT_DIR/data/Machine/settings.json"
mkdir -p "$(dirname "$MACHINE_SETTINGS")"

cat > "$MACHINE_SETTINGS" << 'EOF'
{
    "github.copilot.enable": {
        "*": false
    },
    "github.copilot.chat.enabled": false,
    "github.authentication.enabled": false,
    "microsoft-authentication.enabled": false,
    "chat.enabled": false,
    "inlineChat.enabled": false,
    "workbench.enableExperiments": false,
    "aiConfig.enabled": false
}
EOF

echo "✅ Machine settings configured"
echo ""
echo "🔄 Please restart code-server for changes to take effect"

