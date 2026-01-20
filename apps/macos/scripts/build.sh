#!/bin/bash

# ──────────────────────────────────────────────────────────────
# OdaxAI Studio
# Copyright © 2026 OdaxAI SRL. All rights reserved.
# Licensed under the PolyForm Noncommercial License 1.0.0
# ──────────────────────────────────────────────────────────────

# OdaxStudio - Automated Build Script
# Generates Xcode project and builds the app

set -e

echo "🏗️  OdaxStudio Automated Build"
echo "================================"

cd "$(dirname "$0")"

# Check if xcodegen is installed
if ! command -v xcodegen &> /dev/null; then
    echo "❌ xcodegen not found. Installing..."
    brew install xcodegen
fi

# Generate Xcode project
echo "📦 Generating Xcode project..."
xcodegen generate --spec ../project/project.yml --project ../project

echo "✅ Project generated: OdaxStudio.xcodeproj"

# Build the app
echo "🔨 Building app..."
xcodebuild \
    -project ../project/OdaxStudio.xcodeproj \
    -scheme OdaxStudio \
    -configuration Release \
    -derivedDataPath ../build \
    CODE_SIGN_IDENTITY="" \
    CODE_SIGNING_REQUIRED=NO \
    CODE_SIGNING_ALLOWED=NO

echo ""
echo "✅ Build complete!"
echo ""
echo "📍 App location:"
APP_PATH="../build/Build/Products/Release/OdaxStudio.app"
echo "   $(pwd)/$APP_PATH"
echo ""
echo "To run:"
echo "   open \"$APP_PATH\""
echo ""
echo "To create DMG:"
echo "   hdiutil create -volname \"OdaxAI Studio\" -srcfolder \"$APP_PATH\" -ov -format UDZO OdaxStudio.dmg"
