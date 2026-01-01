#!/bin/bash
# Start Dashboard service

# Get project root dynamically
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$PROJECT_ROOT/apps/web"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"
npm run dev
