#!/bin/bash
# Start Perplexica service

# Get project root dynamically
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$PROJECT_ROOT/services/Perplexica"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
export PORT=3001
npm run dev
