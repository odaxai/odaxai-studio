#!/bin/bash

# OdaxStudio - Create Professional DMG Installer
# Creates a macOS DMG with proper icon positioning

set -e

echo "📦 OdaxStudio DMG Creator"
echo "========================="

cd "$(dirname "$0")"
SCRIPTS_DIR="$(pwd)"
PROJECT_DIR="$(dirname "$SCRIPTS_DIR")/project"
BUILD_DIR="$(dirname "$SCRIPTS_DIR")/build"
DMG_NAME="OdaxStudio-1.1.0"
VOLUME_NAME="OdaxAI Studio"

# Step 1: Build Release version
echo ""
echo "🔨 Building Release version..."

xcodebuild \
    -project "$PROJECT_DIR/OdaxStudio.xcodeproj" \
    -scheme OdaxStudio \
    -configuration Release \
    -derivedDataPath "$BUILD_DIR" \
    CODE_SIGN_IDENTITY="" \
    CODE_SIGNING_REQUIRED=NO \
    CODE_SIGNING_ALLOWED=NO \
    2>&1 | grep -E "(BUILD|error:)" || true

APP_PATH="$BUILD_DIR/Build/Products/Release/OdaxStudio.app"

if [ ! -d "$APP_PATH" ]; then
    echo "❌ Build failed! App not found at: $APP_PATH"
    exit 1
fi

echo "✅ Build successful!"

# Step 2: Create DMG staging
echo ""
echo "📁 Creating DMG..."

DMG_TEMP="/tmp/dmg_temp"
DMG_STAGING="/tmp/dmg_staging.dmg"
DMG_OUTPUT="$SCRIPTS_DIR/$DMG_NAME.dmg"

rm -rf "$DMG_TEMP" "$DMG_STAGING" "$DMG_OUTPUT"
mkdir -p "$DMG_TEMP"

# Copy app and create Applications symlink
cp -R "$APP_PATH" "$DMG_TEMP/"
ln -s /Applications "$DMG_TEMP/Applications"

# Create read-write DMG
hdiutil create -srcfolder "$DMG_TEMP" -volname "$VOLUME_NAME" -fs HFS+ -format UDRW "$DMG_STAGING"

# Mount
DEVICE=$(hdiutil attach -readwrite -noverify -noautoopen "$DMG_STAGING" | egrep '^/dev/' | sed 1q | awk '{print $1}')
sleep 2

# Apply styling
echo "🎨 Styling DMG window..."

osascript <<EOF
tell application "Finder"
    tell disk "$VOLUME_NAME"
        open
        set current view of container window to icon view
        set toolbar visible of container window to false
        set statusbar visible of container window to false
        set bounds of container window to {200, 150, 750, 500}
        set opts to the icon view options of container window
        set icon size of opts to 100
        set arrangement of opts to not arranged
        set position of item "OdaxStudio.app" to {120, 180}
        set position of item "Applications" to {420, 180}
        update without registering applications
        close
    end tell
end tell
EOF

# Unmount
sync
hdiutil detach "$DEVICE"

# Compress
echo "💿 Compressing..."
hdiutil convert "$DMG_STAGING" -format UDZO -o "$DMG_OUTPUT"

# Cleanup
rm -rf "$DMG_TEMP" "$DMG_STAGING"

echo ""
echo "✅ DMG created: $DMG_OUTPUT"
echo ""

# Open to show
open "$DMG_OUTPUT"
