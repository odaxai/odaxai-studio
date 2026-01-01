#!/bin/bash
# Start Code Server service
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

# Get project root dynamically
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

VSIX_PATH="$SCRIPT_DIR/../resources/extensions/llama-vscode-0.0.37.vsix"

# Install llama-vscode extension if not already installed
if [ -f "$VSIX_PATH" ]; then
    code-server --install-extension "$VSIX_PATH" 2>/dev/null
fi

# Create settings for llama-vscode to use local llama-server
SETTINGS_DIR="$HOME/.local/share/code-server/User"
mkdir -p "$SETTINGS_DIR"

# Configure llama-vscode to point to local llama-server
cat > "$SETTINGS_DIR/settings.json" << 'EOF'
{
    "llama-vscode.endpoint": "http://127.0.0.1:8081",
    "llama-vscode.endpoint_chat": "http://127.0.0.1:8081",
    "llama-vscode.endpoint_tools": "http://127.0.0.1:8081",
    "workbench.colorTheme": "Default Dark Modern",
    "editor.fontSize": 14,
    "editor.fontFamily": "'SF Mono', Menlo, Monaco, 'Courier New', monospace"
}
EOF

code-server \
    --bind-addr 127.0.0.1:8080 \
    --auth none \
    --disable-telemetry \
    "$PROJECT_ROOT"
