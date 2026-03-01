#!/bin/bash

# ──────────────────────────────────────────────────────────────
# OdaxAI Studio
# Copyright © 2026 OdaxAI SRL. All rights reserved.
# Licensed under the PolyForm Noncommercial License 1.0.0
# ──────────────────────────────────────────────────────────────

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║         OdaxAI Studio  v1.1          ║"
echo "  ║   Local-first AI workspace (macOS)   ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}OdaxAI Studio currently requires macOS.${NC}"
    exit 1
fi

if [ ! -d "services/odax-chat/node_modules" ]; then
    echo -e "${YELLOW}First run detected — installing dependencies...${NC}"
    ./setup.sh
fi

echo -e "${GREEN}Starting services...${NC}"
echo "  Dashboard  → http://localhost:3000"
echo "  OdaxChat   → http://localhost:3002"
echo "  LLM server → http://localhost:8081"
echo ""

cd apps/macos
chmod +x scripts/run.sh
exec ./scripts/run.sh
