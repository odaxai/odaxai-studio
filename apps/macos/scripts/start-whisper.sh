#!/bin/bash
# Start Whisper server for speech-to-text

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WHISPER_DIR="$SCRIPT_DIR/../../../server/whisper.cpp"
MODEL_NAME="tiny"  # Ultra-fast, small model
MODEL_PATH="$WHISPER_DIR/models/ggml-${MODEL_NAME}.bin"
PORT=8080

cd "$WHISPER_DIR"

# Check if server binary exists, build if needed
if [ ! -f "./build/bin/whisper-server" ]; then
    echo "🔧 Building whisper.cpp server..."
    mkdir -p build
    cd build
    cmake .. -DCMAKE_BUILD_TYPE=Release
    cmake --build . --config Release -j$(sysctl -n hw.ncpu)
    cd ..
    echo "✅ Whisper server built successfully"
fi

# Download model if not exists
if [ ! -f "$MODEL_PATH" ]; then
    echo "📥 Downloading Whisper Tiny model from HuggingFace..."
    echo "   This is a small download (~75MB)..."
    cd models
    ./download-ggml-model.sh "$MODEL_NAME"
    cd ..
    
    if [ ! -f "$MODEL_PATH" ]; then
        echo "❌ Failed to download model. Please download manually:"
        echo "   cd $WHISPER_DIR/models"
        echo "   ./download-ggml-model.sh tiny"
        exit 1
    fi
    echo "✅ Model downloaded successfully"
fi

echo "🎤 Starting Whisper server on port $PORT..."
echo "📁 Model: $MODEL_PATH"

# Start server with auto-convert for webm support
exec ./build/bin/whisper-server \
    -m "$MODEL_PATH" \
    --host 127.0.0.1 \
    --port $PORT \
    --convert \
    -l auto \
    -t 4
