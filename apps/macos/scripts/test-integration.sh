#!/bin/bash

# OdaxAI Studio - Integration Test Script
# Verifies that all components are properly configured

echo "🧪 Testing OdaxAI Studio Integration..."
echo ""

PROJECT_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
USER_DATA_DIR="$PROJECT_ROOT/.odax/code-server/data"
EXT_DIR="$PROJECT_ROOT/.odax/code-server/extensions_isolated"

# Test 1: Check configuration files
echo "1️⃣ Checking configuration files..."
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

check_file "$PROJECT_ROOT/apps/macos/config/code-server-settings.json" "code-server-settings.json"
check_file "$PROJECT_ROOT/apps/macos/config/keybindings.json" "keybindings.json"
check_file "$PROJECT_ROOT/apps/macos/config/custom.css" "custom.css"
check_file "$PROJECT_ROOT/apps/macos/config/product.json" "product.json"
check_file "$PROJECT_ROOT/apps/macos/config/argv.json" "argv.json"

echo ""
echo "📊 Configuration: $PASS/$TOTAL files found"
echo ""

# Test 2: Check llama.vscode extension
echo "2️⃣ Checking llama.vscode extension..."
LLAMA_SOURCE="$PROJECT_ROOT/apps/ide/extensions/ggml-org.llama-vscode-0.0.37-universal"
if [ -d "$LLAMA_SOURCE" ]; then
    echo "  ✅ llama.vscode source found"
    echo "     Path: $LLAMA_SOURCE"
    
    # Check package.json
    if [ -f "$LLAMA_SOURCE/package.json" ]; then
        VERSION=$(grep '"version"' "$LLAMA_SOURCE/package.json" | head -1 | sed 's/.*: "\(.*\)".*/\1/')
        echo "     Version: $VERSION"
    fi
else
    echo "  ❌ llama.vscode source NOT FOUND"
fi

echo ""

# Test 3: Check if code-server is installed
echo "3️⃣ Checking code-server installation..."
if command -v code-server &> /dev/null; then
    CODE_SERVER_VERSION=$(code-server --version | head -1)
    echo "  ✅ code-server installed: $CODE_SERVER_VERSION"
else
    echo "  ⚠️  code-server not in PATH"
    echo "     Install with: curl -fsSL https://code-server.dev/install.sh | sh"
fi

echo ""

# Test 4: Check theme configuration
echo "4️⃣ Checking theme configuration..."
if [ -f "$PROJECT_ROOT/apps/macos/config/code-server-settings.json" ]; then
    if grep -q '"workbench.colorTheme".*"Default Dark Modern"' "$PROJECT_ROOT/apps/macos/config/code-server-settings.json"; then
        echo "  ✅ Dark theme configured"
    fi

    if grep -q '"editor.background".*"#000000"' "$PROJECT_ROOT/apps/macos/config/code-server-settings.json"; then
        echo "  ✅ Black background configured"
    fi

    if grep -q '"llama.enabled".*true' "$PROJECT_ROOT/apps/macos/config/code-server-settings.json"; then
        echo "  ✅ llama.vscode enabled"
    fi
fi

echo ""

# Test 5: Check Swift files
echo "5️⃣ Checking Swift app files..."
SWIFT_FILES=(
    "$PROJECT_ROOT/apps/macos/project/OdaxStudio/OdaxStudio/ContentView.swift"
    "$PROJECT_ROOT/apps/macos/project/OdaxStudio/OdaxStudio/OdaxStudioApp.swift"
    "$PROJECT_ROOT/apps/macos/project/OdaxStudio/OdaxStudio/WebView.swift"
    "$PROJECT_ROOT/apps/macos/project/OdaxStudio/OdaxStudio/ProcessManager.swift"
)

for file in "${SWIFT_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $(basename "$file")"
    else
        echo "  ❌ $(basename "$file") - NOT FOUND"
    fi
done

echo ""

# Test 6: Check ContentView.swift points to localhost:8080
echo "6️⃣ Checking ContentView.swift configuration..."
if grep -q 'http://localhost:3000' "$PROJECT_ROOT/apps/macos/project/OdaxStudio/OdaxStudio/ContentView.swift"; then
    echo "  ✅ ContentView points to web app (port 3000)"
else
    echo "  ⚠️  ContentView may not be configured correctly"
fi

echo ""

# Test 7: Check if ports are available
echo "7️⃣ Checking port availability..."

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

check_port 8080  # code-server
check_port 3000  # web UI (if needed)
check_port 8081  # llama.cpp server

echo ""

# Test 8: Check documentation
echo "8️⃣ Checking documentation..."
check_file "$PROJECT_ROOT/apps/macos/docs/INTEGRATION_NOTES.md" "INTEGRATION_NOTES.md"
check_file "$PROJECT_ROOT/apps/macos/docs/CHANGELOG.md" "CHANGELOG.md"
check_file "$PROJECT_ROOT/apps/macos/docs/README.md" "README.md"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Integration Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $PASS -eq $TOTAL ]; then
    echo "✅ All tests passed! Ready to run."
    echo ""
    echo "🚀 Start with: ./apps/macos/run.sh"
    exit 0
else
    echo "⚠️  Some tests failed. Review the output above."
    echo ""
    echo "📝 Missing files: $((TOTAL - PASS))/$TOTAL"
    exit 1
fi

