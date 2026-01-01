#!/bin/bash
# Start llama-server using bundled binaries
SCRIPT_DIR="$(dirname "$0")"
LLAMA_DIR="$SCRIPT_DIR/../resources/llama-server"

cd "$LLAMA_DIR"

# Check if llama-server is already running on port 8081
if lsof -ti:8081 >/dev/null 2>&1; then
    echo "✅ llama-server already running on port 8081"
    exit 0
fi

# Preferred models in order - verified working
PREFERRED_MODELS=(
    "$HOME/.odax/models/TheBloke_Mistral-7B-Instruct-v0.2-GGUF/mistral-7b-instruct-v0.2.Q4_K_M.gguf"
    "$HOME/.odax/models/bartowski_Deepthink-Reasoning-7B-GGUF/Deepthink-Reasoning-7B-IQ2_M.gguf"
    "$HOME/.odax/models/Qwen_Qwen2.5-Coder-3B-Instruct-GGUF/qwen2.5-coder-3b-instruct-q4_k_m.gguf"
)

MODEL=""
for m in "${PREFERRED_MODELS[@]}"; do
    if [ -f "$m" ]; then
        # Verify model size is reasonable (>500MB for a working 3B+ model)
        SIZE=$(stat -f%z "$m" 2>/dev/null || stat -c%s "$m" 2>/dev/null)
        if [ "$SIZE" -gt 500000000 ]; then
            MODEL="$m"
            break
        fi
    fi
done

# Fallback: find any GGUF model > 500MB
if [ -z "$MODEL" ]; then
    MODEL=$(find ~/.odax/models -name "*.gguf" -type f -size +500M 2>/dev/null | head -1)
fi

if [ -z "$MODEL" ]; then
    echo "⚠️ No valid GGUF model found (need >500MB) - AI features disabled"
    echo "   Download a model to ~/.odax/models/"
    exit 0
fi

echo "🦙 Starting llama-server with: $(basename "$MODEL")"

./llama-server \
    -m "$MODEL" \
    --host 127.0.0.1 \
    --port 8081 \
    -c 10240 \
    --n-gpu-layers 99 \
    --cont-batching \
    -b 512 \
    -ub 512 \
    --threads 6 \
    -np 1 \
    --cache-reuse 256 &

echo "✅ llama-server started in background (max speed)"
