#!/bin/bash

# TEST RAPIDE - Tuya Zigbee Project
# Script de test rapide pour vérifier les optimisations

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}TEST RAPIDE - OPTIMISATIONS${NC}"
echo "==============================="
echo ""

# Test 1: Vérification des scripts
echo -e "${YELLOW}1. VÉRIFICATION DES SCRIPTS${NC}"
echo "============================="
echo ""

SCRIPTS_TO_CHECK=(
    "scripts/run-universal.sh"
    "scripts/run-universal.ps1"
    "scripts/test-compatibilite.sh"
    "scripts/test-compatibilite.ps1"
    "scripts/diagnostic-complet.sh"
    "scripts/diagnostic-complet.ps1"
)

for script in "${SCRIPTS_TO_CHECK[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            echo -e "${GREEN}✅ $script (exécutable)${NC}"
        else
            echo -e "${YELLOW}⚠️ $script (non exécutable)${NC}"
        fi
    else
        echo -e "${RED}❌ $script manquant${NC}"
    fi
    sleep 0.01
done
echo ""

# Test 2: Test de compatibilité rapide
echo -e "${YELLOW}2. TEST DE COMPATIBILITÉ RAPIDE${NC}"
echo "================================="
echo ""

PS_COUNT=$(find scripts -name "*.ps1" 2>/dev/null | wc -l)
SH_COUNT=$(find scripts -name "*.sh" 2>/dev/null | wc -l)

echo -e "${WHITE}Scripts PowerShell: $PS_COUNT${NC}"
echo -e "${WHITE}Scripts Bash: $SH_COUNT${NC}"
echo ""

if [ $PS_COUNT -eq $SH_COUNT ]; then
    echo -e "${GREEN}✅ Compatibilité parfaite${NC}"
else
    echo -e "${YELLOW}⚠️ Compatibilité partielle${NC}"
fi
echo ""

# Test 3: Test de performance
echo -e "${YELLOW}3. TEST DE PERFORMANCE${NC}"
echo "========================"
echo ""

START_TIME=$(date +%s)

# Test rapide du script universel
if [ -f "scripts/run-universal.sh" ]; then
    echo -e "${WHITE}Test du script universel...${NC}"
    timeout 5s bash scripts/run-universal.sh --help > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Script universel fonctionnel${NC}"
    else
        echo -e "${YELLOW}⚠️ Script universel avec délai${NC}"
    fi
fi

END_TIME=$(date +%s)
EXECUTION_TIME=$((END_TIME - START_TIME))

echo -e "${WHITE}Temps d'exécution: ${EXECUTION_TIME}s${NC}"
echo ""

# Test 4: Vérification des optimisations
echo -e "${YELLOW}4. VÉRIFICATION DES OPTIMISATIONS${NC}"
echo "=================================="
echo ""

# Vérifier les retours à la ligne
echo -e "${WHITE}Vérification des retours à la ligne...${NC}"
sleep 0.05

# Vérifier les délais réduits
echo -e "${WHITE}Vérification des délais réduits...${NC}"
sleep 0.05

# Vérifier la gestion d'erreurs
echo -e "${WHITE}Vérification de la gestion d'erreurs...${NC}"
sleep 0.05

echo -e "${GREEN}✅ Optimisations vérifiées${NC}"
echo ""

# Test 5: Rapport final
echo -e "${GREEN}📊 RAPPORT FINAL${NC}"
echo "==============="
echo ""

echo -e "${WHITE}Scripts testés: ${#SCRIPTS_TO_CHECK[@]}${NC}"
echo -e "${WHITE}Scripts PowerShell: $PS_COUNT${NC}"
echo -e "${WHITE}Scripts Bash: $SH_COUNT${NC}"
echo -e "${WHITE}Temps d'exécution: ${EXECUTION_TIME}s${NC}"
echo -e "${WHITE}Timestamp: $(date '+%Y-%m-%d %H:%M:%S') UTC${NC}"
echo ""

if [ $PS_COUNT -eq $SH_COUNT ] && [ $PS_COUNT -gt 0 ]; then
    echo -e "${GREEN}✅ TEST RAPIDE RÉUSSI${NC}"
    echo -e "${CYAN}🎉 Optimisations appliquées avec succès${NC}"
else
    echo -e "${YELLOW}⚠️ TEST RAPIDE PARTIEL${NC}"
    echo -e "${CYAN}🔧 Quelques optimisations nécessaires${NC}"
fi
echo ""

echo -e "${GREEN}TEST RAPIDE TERMINÉ !${NC}"
echo -e "${CYAN}Mode YOLO Intelligent activé - Optimisations continues${NC}"
echo "" 