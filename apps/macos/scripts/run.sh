#!/bin/bash

echo "🚀 Starting OdaxAI Studio..."

# Get project root (3 levels up from apps/macos/scripts)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
echo "📁 Project root: $PROJECT_ROOT"

# Always rebuild to ensure latest changes
echo "📦 Building OdaxStudio..."
cd "$PROJECT_ROOT/apps/macos/project"
xcodebuild -project OdaxStudio.xcodeproj -scheme OdaxStudio -configuration Debug build -quiet 2>&1 | tail -5

# Use Debug build path
APP_PATH="$HOME/Library/Developer/Xcode/DerivedData"
APP_BUNDLE=$(find "$APP_PATH" -name "OdaxStudio.app" -path "*/Debug/*" 2>/dev/null | head -1)

if [ -z "$APP_BUNDLE" ]; then
    echo "❌ Build failed or app not found"
    exit 1
fi

# Launch app
echo "🚀 Launching OdaxStudio from: $APP_BUNDLE"
open "$APP_BUNDLE"

echo "✅ OdaxStudio launched!"
echo "💡 The app will start all services automatically."
