#!/bin/bash
# ============================================
# OdaxEngine - Setup & Restore Script
# ============================================
# Questo script reinstalla tutte le dipendenze
# e prepara il progetto per essere eseguito.
# 
# Uso: ./setup.sh
# ============================================

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

echo "🔧 OdaxEngine Setup Script"
echo "=========================="
echo ""

# Colori
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Funzione per installare dipendenze
install_deps() {
    local dir=$1
    local name=$2
    local extra_flags=$3
    
    if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
        echo -e "${YELLOW}📦 Installing $name...${NC}"
        cd "$dir"
        rm -rf node_modules 2>/dev/null || true
        npm install $extra_flags 2>&1 | tail -5
        echo -e "${GREEN}✅ $name installed${NC}"
        cd "$PROJECT_ROOT"
    else
        echo -e "${RED}⚠️ $name directory not found, skipping...${NC}"
    fi
}

# 1. Installa dipendenze apps/web
install_deps "$PROJECT_ROOT/apps/web" "Dashboard (apps/web)" ""

# 2. Installa dipendenze odax-chat (richiede --legacy-peer-deps)
install_deps "$PROJECT_ROOT/services/odax-chat" "OdaxChat" "--legacy-peer-deps"

# 3. Installa dipendenze Perplexica (opzionale)
install_deps "$PROJECT_ROOT/services/Perplexica" "Perplexica" ""

# 4. Verifica installazione
echo ""
echo "🔍 Verifying installations..."

# Verifica odax-chat
cd "$PROJECT_ROOT/services/odax-chat"
if npm ls next 2>&1 | grep -q "invalid"; then
    echo -e "${RED}❌ OdaxChat has dependency issues!${NC}"
    echo "   Try fixing package.json: change next@16.x.x to next@15.1.0"
    exit 1
else
    echo -e "${GREEN}✅ OdaxChat dependencies OK${NC}"
fi

cd "$PROJECT_ROOT"

echo ""
echo "========================================"
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "To run the app:"
echo "  cd apps/macos/scripts && sh run.sh"
echo ""
echo "Or to start services manually:"
echo "  # Terminal 1 - Dashboard"
echo "  cd apps/web && npm run dev"
echo ""
echo "  # Terminal 2 - OdaxChat"  
echo "  cd services/odax-chat && PORT=3002 npm run dev"
echo "========================================"
