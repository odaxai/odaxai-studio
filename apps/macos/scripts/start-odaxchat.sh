#!/bin/bash
# Start OdaxChat service

# Get project root dynamically
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$PROJECT_ROOT/services/odax-chat"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
export PORT=3002
npm run dev
