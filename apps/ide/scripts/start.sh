#!/bin/bash

# Start code-server for OdaxAI IDE

set -e

# Check if code-server is installed
if ! command -v code-server &> /dev/null; then
    echo "❌ code-server not found. Run 'pnpm run setup:ide' first."
    exit 1
fi

# Check if config exists
if [ ! -f "config/config.yaml" ]; then
    echo "❌ Configuration not found. Run 'pnpm run setup:ide' first."
    exit 1
fi

echo "🚀 Starting OdaxAI IDE (code-server)..."

# Start code-server
code-server \
  --config config/config.yaml \
  --disable-telemetry \
  --disable-update-check \
  --disable-workspace-trust \
  .

# Note: This runs in foreground. Use Ctrl+C to stop.
# For background mode, add '&' at the end or use process manager.

