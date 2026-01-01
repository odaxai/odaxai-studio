#!/bin/bash

# Stop code-server

echo "⏹️  Stopping code-server..."

# Find and kill code-server processes
pkill -f "code-server" || echo "No code-server process found"

echo "✅ Stopped"

