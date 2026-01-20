#!/bin/bash

# ──────────────────────────────────────────────────────────────
# OdaxAI Studio
# Copyright © 2026 OdaxAI SRL. All rights reserved.
# Licensed under the PolyForm Noncommercial License 1.0.0
# ──────────────────────────────────────────────────────────────

# OdaxAI Studio - Integration Test Script
# Verifies that all components are properly configured

echo "🧪 Testing OdaxAI Studio Integration..."
echo ""

PROJECT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"

PASS=0
TOTAL=0

check_file() {
    TOTAL=$((TOTAL+1))
    if [ -f "$1" ]; then
        echo "  ✅ $2"
        PASS=$((PASS+1))
        return 0
    else
        echo "  ❌ $2 - NOT FOUND"
        return 1
    fi
}

check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        PROC=$(lsof -Pi :$1 -sTCP:LISTEN -t | head -1)
        PROC_NAME=$(ps -p $PROC -o comm= 2>/dev/null || echo "unknown")
        echo "  ⚠️  Port $1 in use by: $PROC_NAME (PID: $PROC)"
        return 1
    else
        echo "  ✅ Port $1 available"
        return 0
    fi
}

# Test 1: Check Swift source files
echo "1️⃣ Checking Swift app files..."
SWIFT_FILES=(
    "$PROJECT_ROOT/apps/macos/project/OdaxStudio/OdaxStudio/ContentView.swift"
    "$PROJECT_ROOT/apps/macos/project/OdaxStudio/OdaxStudio/OdaxStudioApp.swift"
    "$PROJECT_ROOT/apps/macos/project/OdaxStudio/OdaxStudio/WebView.swift"
    "$PROJECT_ROOT/apps/macos/project/OdaxStudio/OdaxStudio/ProcessManager.swift"
)

for file in "${SWIFT_FILES[@]}"; do
    TOTAL=$((TOTAL+1))
    if [ -f "$file" ]; then
        echo "  ✅ $(basename "$file")"
        PASS=$((PASS+1))
    else
        echo "  ❌ $(basename "$file") - NOT FOUND"
    fi
done

echo ""

# Test 2: Check startup scripts
echo "2️⃣ Checking startup scripts..."
check_file "$PROJECT_ROOT/apps/macos/scripts/start-dashboard.sh" "start-dashboard.sh"
check_file "$PROJECT_ROOT/apps/macos/scripts/start-odaxchat.sh" "start-odaxchat.sh"
check_file "$PROJECT_ROOT/apps/macos/scripts/start-llama.sh" "start-llama.sh"
check_file "$PROJECT_ROOT/apps/macos/scripts/start-python-executor.sh" "start-python-executor.sh"
check_file "$PROJECT_ROOT/apps/macos/scripts/run.sh" "run.sh"

echo ""

# Test 3: Check odax-chat service
echo "3️⃣ Checking OdaxAI Chat service..."
check_file "$PROJECT_ROOT/services/odax-chat/package.json" "odax-chat/package.json"
check_file "$PROJECT_ROOT/services/odax-chat/next.config.js" "odax-chat/next.config.js"

echo ""

# Test 4: Check ContentView points to port 3000
echo "4️⃣ Checking ContentView configuration..."
if grep -q 'http://localhost:3000' "$PROJECT_ROOT/apps/macos/project/OdaxStudio/OdaxStudio/ContentView.swift"; then
    echo "  ✅ ContentView points to Dashboard (port 3000)"
else
    echo "  ⚠️  ContentView may not be configured correctly"
fi

echo ""

# Test 5: Check port availability
echo "5️⃣ Checking port availability..."
check_port 3000   # Dashboard
check_port 3002   # OdaxAI Chat
check_port 8081   # llama.cpp server

echo ""

# Test 6: Check models directory
echo "6️⃣ Checking models directory..."
MODELS_DIR="$HOME/.odax/models"
if [ -d "$MODELS_DIR" ]; then
    GGUF_COUNT=$(find "$MODELS_DIR" -name "*.gguf" 2>/dev/null | wc -l | tr -d ' ')
    if [ "$GGUF_COUNT" -gt 0 ]; then
        echo "  ✅ Models directory found with $GGUF_COUNT GGUF model(s)"
    else
        echo "  ⚠️  Models directory exists but no .gguf models found"
        echo "     Download a model and place it in ~/.odax/models/"
    fi
else
    echo "  ⚠️  ~/.odax/models not found — will be created on first launch"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Integration Test Summary: $PASS/$TOTAL checks passed"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $PASS -eq $TOTAL ]; then
    echo "✅ All checks passed! Ready to run."
    echo ""
    echo "🚀 Start with: ./run-odax.sh"
    exit 0
else
    echo "⚠️  Some checks failed. Review the output above."
    exit 1
fi
