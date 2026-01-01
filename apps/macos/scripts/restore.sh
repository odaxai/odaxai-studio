#!/bin/bash
# ============================================
# OdaxEngine - COMPLETE RESTORE SCRIPT
# ============================================
# Questo script recupera il progetto da GitHub
# e reinstalla tutte le dipendenze.
# 
# Uso: ./restore.sh [commit]
# Esempi:
#   ./restore.sh              # Ripristina all'ultimo commit su GitHub
#   ./restore.sh 68bd59c1     # Ripristina a un commit specifico
# ============================================

set -e

# Get project root dynamically
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
cd "$PROJECT_ROOT"

# Colori
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     OdaxEngine Complete Restore Script     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

COMMIT_HASH=$1

# Step 1: Stop any running services
echo -e "${YELLOW}🛑 Stopping running services...${NC}"
pkill -f "next dev" 2>/dev/null || true
pkill -f "node.*3000" 2>/dev/null || true
pkill -f "node.*3001" 2>/dev/null || true
pkill -f "node.*3002" 2>/dev/null || true
pkill -f "llama-server" 2>/dev/null || true
sleep 2
echo -e "${GREEN}✅ Services stopped${NC}"

# Step 2: Stash any local changes
echo ""
echo -e "${YELLOW}📦 Saving local changes (if any)...${NC}"
git stash 2>/dev/null || true
echo -e "${GREEN}✅ Local changes stashed${NC}"

# Step 3: Fetch latest from GitHub
echo ""
echo -e "${YELLOW}🔄 Fetching latest from GitHub...${NC}"
git fetch origin main
echo -e "${GREEN}✅ Fetched${NC}"

# Step 4: Reset to commit
echo ""
if [ -z "$COMMIT_HASH" ]; then
    echo -e "${YELLOW}🔄 Resetting to latest commit on origin/main...${NC}"
    git reset --hard origin/main
else
    echo -e "${YELLOW}🔄 Resetting to commit: $COMMIT_HASH...${NC}"
    git reset --hard "$COMMIT_HASH"
fi
echo -e "${GREEN}✅ Code restored${NC}"

# Step 5: Show current commit
echo ""
echo -e "${BLUE}📍 Current commit:${NC}"
git log -1 --oneline

# Step 6: Install dependencies
echo ""
echo -e "${YELLOW}📦 Installing dependencies...${NC}"

# Function to install deps with error handling
install_deps() {
    local dir=$1
    local name=$2
    local extra_flags=$3
    
    if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
        echo -e "${YELLOW}   📦 Installing $name...${NC}"
        cd "$dir"
        rm -rf node_modules 2>/dev/null || true
        
        if npm install $extra_flags 2>&1 | tail -3; then
            echo -e "${GREEN}   ✅ $name installed${NC}"
        else
            echo -e "${RED}   ❌ $name installation failed, trying with --legacy-peer-deps${NC}"
            npm install --legacy-peer-deps 2>&1 | tail -3
        fi
        cd "$PROJECT_ROOT"
    fi
}

# Install all services
install_deps "$PROJECT_ROOT/apps/web" "Dashboard (apps/web)" ""
install_deps "$PROJECT_ROOT/services/odax-chat" "OdaxChat" "--legacy-peer-deps"
install_deps "$PROJECT_ROOT/services/Perplexica" "Perplexica" "--legacy-peer-deps"

# Step 7: Fix known issues
echo ""
echo -e "${YELLOW}🔧 Checking for known issues...${NC}"

# Check if next version is valid
cd "$PROJECT_ROOT/services/odax-chat"
if npm ls next 2>&1 | grep -q "invalid"; then
    echo -e "${YELLOW}   ⚠️ Invalid next version detected, fixing...${NC}"
    # The package.json should already have the correct version after git reset
    rm -rf node_modules
    npm install --legacy-peer-deps 2>&1 | tail -3
fi
cd "$PROJECT_ROOT"
echo -e "${GREEN}✅ Known issues checked${NC}"

# Step 8: Verify installation
echo ""
echo -e "${YELLOW}🔍 Verifying installation...${NC}"

ERRORS=0

# Check odax-chat
cd "$PROJECT_ROOT/services/odax-chat"
if [ -f "node_modules/.bin/next" ]; then
    echo -e "${GREEN}   ✅ OdaxChat: next installed${NC}"
else
    echo -e "${RED}   ❌ OdaxChat: next NOT installed${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check apps/web
cd "$PROJECT_ROOT/apps/web"
if [ -f "node_modules/.bin/next" ]; then
    echo -e "${GREEN}   ✅ Dashboard: next installed${NC}"
else
    echo -e "${RED}   ❌ Dashboard: next NOT installed${NC}"
    ERRORS=$((ERRORS + 1))
fi

cd "$PROJECT_ROOT"

# Final summary
echo ""
echo -e "${BLUE}════════════════════════════════════════════${NC}"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ RESTORE COMPLETE!${NC}"
    echo ""
    echo -e "To run the app:"
    echo -e "  ${YELLOW}cd apps/macos/scripts && sh run.sh${NC}"
    echo ""
else
    echo -e "${RED}⚠️ RESTORE COMPLETED WITH $ERRORS ERRORS${NC}"
    echo -e "Please check the errors above and try running:"
    echo -e "  ${YELLOW}./setup.sh${NC}"
fi
echo -e "${BLUE}════════════════════════════════════════════${NC}"
echo ""
