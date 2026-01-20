#!/bin/bash

# ──────────────────────────────────────────────────────────────
# OdaxAI Studio
# Copyright © 2026 OdaxAI SRL. All rights reserved.
# Licensed under the PolyForm Noncommercial License 1.0.0
# ──────────────────────────────────────────────────────────────

export PATH="/usr/local/bin:/opt/homebrew/bin:$PATH"

# Get the script's directory and project root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Define paths
SERVICE_DIR="$PROJECT_ROOT/server/python-executor"
LOG_FILE="$PROJECT_ROOT/logs/python-executor.log"

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

echo "Starting Python Executor..." > "$LOG_FILE"
echo "Project Root: $PROJECT_ROOT" >> "$LOG_FILE"
echo "Service Dir: $SERVICE_DIR" >> "$LOG_FILE"

# Check if service directory exists
if [ ! -d "$SERVICE_DIR" ]; then
    echo "Error: Service directory not found at $SERVICE_DIR" >> "$LOG_FILE"
    exit 1
fi

cd "$SERVICE_DIR"

# Install requirements if needed (rudimentary check)
if [ -f "requirements.txt" ]; then
    # Create venv if not exists
    if [ ! -d "venv" ]; then
        python3 -m venv venv
    fi
    source venv/bin/activate
    pip install -r requirements.txt >> "$LOG_FILE" 2>&1
else
    # Fallback if no venv/requirements
    echo "No requirements.txt found, skipping install" >> "$LOG_FILE"
fi

# Run the server
# Assuming app.py or server.py is the entry point. 
# I will check the file list from the previous step output to be sure.
# For now, I'll assume 'app.py' or similar based on typical flask/fastapi apps.
# Better to wait for ls output before finalizing the script content? 
# Actually, I can use a generic start command if I see a 'start.sh' inside.

if [ -f "start.sh" ]; then
    sh start.sh >> "$LOG_FILE" 2>&1
else
    python3 app.py >> "$LOG_FILE" 2>&1
fi
