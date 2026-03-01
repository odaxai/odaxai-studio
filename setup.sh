#!/bin/bash

# ──────────────────────────────────────────────────────────────
# OdaxAI Studio
# Copyright © 2026 OdaxAI SRL. All rights reserved.
# Licensed under the PolyForm Noncommercial License 1.0.0
# ──────────────────────────────────────────────────────────────
#
# Installs all dependencies and prepares the project.
# Usage: ./setup.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "  OdaxAI Studio — Setup"
echo "  ====================="
echo ""

install_deps() {
    local dir=$1
    local name=$2
    local extra_flags=$3

    if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
        echo -e "${YELLOW}Installing $name...${NC}"
        cd "$dir"
        rm -rf node_modules 2>/dev/null || true
        npm install $extra_flags 2>&1 | tail -5
        echo -e "${GREEN}  $name installed${NC}"
        cd "$PROJECT_ROOT"
    else
        echo -e "${RED}  $name directory not found, skipping${NC}"
    fi
}

install_deps "$PROJECT_ROOT/apps/web" "Dashboard (apps/web)" ""
install_deps "$PROJECT_ROOT/services/odax-chat" "OdaxChat (services/odax-chat)" "--legacy-peer-deps"

echo ""
echo -e "${GREEN}Setup complete.${NC}"
echo ""
echo "  To launch:  ./run-odax.sh"
echo ""
echo "  Or start services individually:"
echo "    cd apps/web            && npm run dev          # Dashboard  :3000"
echo "    cd services/odax-chat  && PORT=3002 npm run dev # OdaxChat   :3002"
echo ""
