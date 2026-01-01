#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Force uninstall interfering extensions BEFORE doing anything else
echo "🧹 Cleaning up VSCode extensions..."
EXT_LIST="github.copilot github.copilot-chat ms-vscode.vscode-chat coder.coder-remote coder.coder-cloud sourcegraph.cody-ai codeium.codeium continue.continue"

for ext in $EXT_LIST; do
    echo "   Uninstalling $ext..."
    code-server --uninstall-extension $ext >/dev/null 2>&1
done

# Configure code-server settings
CONFIG_DIR="$HOME/.local/share/code-server/User"
mkdir -p "$CONFIG_DIR"

cat > "$CONFIG_DIR/settings.json" << 'EOF'
{
  "workbench.colorTheme": "Default Dark Modern",
  "workbench.colorCustomizations": {
    "editor.background": "#000000",
    "sideBar.background": "#000000",
    "activityBar.background": "#000000",
    "statusBar.background": "#000000",
    "titleBar.activeBackground": "#000000",
    "panel.background": "#000000",
    "terminal.background": "#000000"
  },
  "editor.fontSize": 14,
  "editor.fontFamily": "Menlo, Monaco, 'Courier New', monospace",
  
  "_comment": "Disable ALL chat and authentication features",
  "github.copilot.enable": false,
  "github.copilot.chat.enable": false,
  "github.authentication.enabled": false,
  "microsoft-authentication.enabled": false,
  "github.gitAuthentication": false,
  "chat.editor.wordWrap": "off",
  "chat.enabled": false,
  "chat.commandCenter.enabled": false,
  "inlineChat.enabled": false,
  "workbench.panel.chat.enabled": false,
  "workbench.view.chat.enabled": false,
  "workbench.auxiliaryBar.enabled": false,
  "workbench.enableExperiments": false,
  "workbench.settings.enableNaturalLanguageSearch": false,
  "security.workspace.trust.enabled": false,
  "extensions.ignoreRecommendations": true,
  "settingsSync.enabled": false,
  "telemetry.telemetryLevel": "off",
  "aiConfig.enabled": false,
  "accessibility.signals.chatRequestSent": "off",
  "accessibility.signals.chatResponseReceived": "off"
}
EOF

# Also run the stronger auth-popup disable script if available
if [ -x "$SCRIPT_DIR/apps/ide/disable-auth-popup.sh" ]; then
    "$SCRIPT_DIR/apps/ide/disable-auth-popup.sh"
fi

echo "✅ Environment configured & Cleaned"
