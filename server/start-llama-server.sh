#!/bin/bash

# ──────────────────────────────────────────────────────────────
# OdaxAI Studio
# Copyright © 2026 OdaxAI SRL. All rights reserved.
# Licensed under the PolyForm Noncommercial License 1.0.0
# ──────────────────────────────────────────────────────────────


# OdaxAI - Llama.cpp Server Launcher
# Avvia il server llama.cpp per inference locale

set -e

cd "$(dirname "$0")/llama.cpp"

# Check if server binary exists
if [ ! -f "./build/bin/llama-server" ]; then
    echo "❌ llama-server not found. Please compile first:"
    echo "   cd llama.cpp && cmake -B build && cmake --build build --config Release"
    exit 1
fi

# Check if model path is provided
MODEL_PATH="${1:-}"
if [ -z "$MODEL_PATH" ]; then
    echo "❌ Usage: $0 <path-to-model.gguf>"
    echo "Example: $0 ~/.odax/models/qwen2.5-coder-7b-instruct-q4_k_m.gguf"
    exit 1
fi

if [ ! -f "$MODEL_PATH" ]; then
    echo "❌ Model not found: $MODEL_PATH"
    exit 1
fi

echo "🦙 Starting llama.cpp server..."
echo "📁 Model: $MODEL_PATH"
echo "🌐 Server will be available at: http://localhost:8081"
echo ""

# Start server
./build/bin/llama-server \
    -m "$MODEL_PATH" \
    --host 127.0.0.1 \
    --port 8081 \
    -c 32768 \
    --n-gpu-layers 99 \
    --metrics \
    --log-format text

