#!/bin/bash

# DIAGNOSTIC COMPLET - Tuya Zigbee Project
# Script de diagnostic complet du projet (Bash version)

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Variables
REPORT_FILE="DIAGNOSTIC-COMPLET-$(date +%Y%m%d-%H%M%S).md"

echo -e "${CYAN}DIAGNOSTIC COMPLET DU PROJET${NC}"
echo "==============================="

# Fonction pour ajouter au rapport
add_to_report() {
    echo "$1" >> "$REPORT_FILE"
}

# Initialiser le rapport
cat > "$REPORT_FILE" << EOF
# DIAGNOSTIC COMPLET - Tuya Zigbee Project

## 📊 MÉTRIQUES GÉNÉRALES

EOF

# 1) Analyse de la structure du projet
echo -e "${YELLOW}1. ANALYSE DE LA STRUCTURE${NC}"
echo "============================"

REPO_SIZE=$(du -sm . | cut -f1)
FILE_COUNT=$(find . -type f | wc -l)
DIR_COUNT=$(find . -type d | wc -l)

echo -e "${WHITE}Taille du repo: ${REPO_SIZE} MB${NC}"
echo -e "${WHITE}Nombre de fichiers: $FILE_COUNT${NC}"
echo -e "${WHITE}Nombre de dossiers: $DIR_COUNT${NC}"

add_to_report "### Structure du Projet"
add_to_report "- Taille du repository: ${REPO_SIZE} MB"
add_to_report "- Nombre de fichiers: $FILE_COUNT"
add_to_report "- Nombre de dossiers: $DIR_COUNT"

# 2) Analyse des drivers
echo -e "${YELLOW}2. ANALYSE DES DRIVERS${NC}"
echo "======================="

DRIVER_COUNT=$(find drivers -name "*.js" -type f 2>/dev/null | wc -l)
DRIVER_DIRS=$(find drivers -type d 2>/dev/null | wc -l)

echo -e "${WHITE}Nombre de drivers: $DRIVER_COUNT${NC}"
echo -e "${WHITE}Dossiers de drivers: $DRIVER_DIRS${NC}"

add_to_report ""
add_to_report "### Drivers Supportés"
add_to_report "- Nombre de drivers: $DRIVER_COUNT"
add_to_report "- Dossiers de drivers: $DRIVER_DIRS"

# 3) Analyse des langues
echo -e "${YELLOW}3. ANALYSE DES LANGUES${NC}"
echo "====================="

LANGUAGE_FILES=$(find locales -name "*.json" -o -name "*.md" 2>/dev/null | wc -l)
LANGUAGES=$(find locales -name "*.json" -o -name "*.md" 2>/dev/null | xargs -n 1 basename | sort | uniq | tr '\n' ', ' | sed 's/,$//')

echo -e "${WHITE}Nombre de langues: $LANGUAGE_FILES${NC}"
echo -e "${WHITE}Langues supportées: $LANGUAGES${NC}"

add_to_report ""
add_to_report "### Support Multilingue"
add_to_report "- Nombre de langues: $LANGUAGE_FILES"
add_to_report "- Langues supportées: $LANGUAGES"

# 4) Analyse des workflows
echo -e "${YELLOW}4. ANALYSE DES WORKFLOWS${NC}"
echo "========================"

WORKFLOW_COUNT=$(find .github/workflows -name "*.yml" -o -name "*.yaml" 2>/dev/null | wc -l)

echo -e "${WHITE}Nombre de workflows: $WORKFLOW_COUNT${NC}"

add_to_report ""
add_to_report "### Workflows GitHub"
add_to_report "- Nombre de workflows: $WORKFLOW_COUNT"

# 5) Analyse des scripts
echo -e "${YELLOW}5. ANALYSE DES SCRIPTS${NC}"
echo "====================="

PS_SCRIPTS=$(find scripts -name "*.ps1" 2>/dev/null | wc -l)
SH_SCRIPTS=$(find scripts -name "*.sh" 2>/dev/null | wc -l)
JS_SCRIPTS=$(find scripts -name "*.js" 2>/dev/null | wc -l)

echo -e "${WHITE}Scripts PowerShell: $PS_SCRIPTS${NC}"
echo -e "${WHITE}Scripts Bash: $SH_SCRIPTS${NC}"
echo -e "${WHITE}Scripts JavaScript: $JS_SCRIPTS${NC}"

add_to_report ""
add_to_report "### Scripts Disponibles"
add_to_report "- Scripts PowerShell: $PS_SCRIPTS"
add_to_report "- Scripts Bash: $SH_SCRIPTS"
add_to_report "- Scripts JavaScript: $JS_SCRIPTS"

# 6) Analyse des assets
echo -e "${YELLOW}6. ANALYSE DES ASSETS${NC}"
echo "====================="

ASSET_COUNT=$(find assets -type f 2>/dev/null | wc -l)
ASSET_SIZE=$(du -sm assets 2>/dev/null | cut -f1 || echo "0")

echo -e "${WHITE}Nombre d'assets: $ASSET_COUNT${NC}"
echo -e "${WHITE}Taille des assets: ${ASSET_SIZE} MB${NC}"

add_to_report ""
add_to_report "### Assets"
add_to_report "- Nombre d'assets: $ASSET_COUNT"
add_to_report "- Taille des assets: ${ASSET_SIZE} MB"

# 7) Analyse du dashboard
echo -e "${YELLOW}7. ANALYSE DU DASHBOARD${NC}"
echo "========================"

if [ -d "dashboard" ]; then
    DASHBOARD_FILES=$(find dashboard -type f | wc -l)
    DASHBOARD_SIZE=$(du -sm dashboard | cut -f1)
    echo -e "${WHITE}Fichiers dashboard: $DASHBOARD_FILES${NC}"
    echo -e "${WHITE}Taille dashboard: ${DASHBOARD_SIZE} MB${NC}"
    
    add_to_report ""
    add_to_report "### Dashboard"
    add_to_report "- Fichiers dashboard: $DASHBOARD_FILES"
    add_to_report "- Taille dashboard: ${DASHBOARD_SIZE} MB"
else
    echo -e "${RED}Dashboard non trouvé${NC}"
    add_to_report ""
    add_to_report "### Dashboard"
    add_to_report "- Status: Non trouvé"
fi

# 8) Analyse Git
echo -e "${YELLOW}8. ANALYSE GIT${NC}"
echo "==============="

if [ -d ".git" ]; then
    BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo "0")
    LAST_COMMIT=$(git log -1 --format="%H" 2>/dev/null || echo "unknown")
    
    echo -e "${WHITE}Branche actuelle: $BRANCH${NC}"
    echo -e "${WHITE}Nombre de commits: $COMMIT_COUNT${NC}"
    echo -e "${WHITE}Dernier commit: $LAST_COMMIT${NC}"
    
    add_to_report ""
    add_to_report "### Git Repository"
    add_to_report "- Branche actuelle: $BRANCH"
    add_to_report "- Nombre de commits: $COMMIT_COUNT"
    add_to_report "- Dernier commit: $LAST_COMMIT"
else
    echo -e "${RED}Repository Git non trouvé${NC}"
    add_to_report ""
    add_to_report "### Git Repository"
    add_to_report "- Status: Non trouvé"
fi

# 9) Analyse des dépendances
echo -e "${YELLOW}9. ANALYSE DES DÉPENDANCES${NC}"
echo "=========================="

if [ -f "package.json" ]; then
    DEP_COUNT=$(grep -c '"dependencies"' package.json || echo "0")
    DEV_DEP_COUNT=$(grep -c '"devDependencies"' package.json || echo "0")
    
    echo -e "${WHITE}Dépendances: $DEP_COUNT${NC}"
    echo -e "${WHITE}Dépendances dev: $DEV_DEP_COUNT${NC}"
    
    add_to_report ""
    add_to_report "### Dépendances"
    add_to_report "- Dépendances: $DEP_COUNT"
    add_to_report "- Dépendances dev: $DEV_DEP_COUNT"
else
    echo -e "${YELLOW}package.json non trouvé${NC}"
    add_to_report ""
    add_to_report "### Dépendances"
    add_to_report "- Status: package.json non trouvé"
fi

# 10) Analyse des fichiers critiques
echo -e "${YELLOW}10. ANALYSE FICHIERS CRITIQUES${NC}"
echo "==============================="

CRITICAL_FILES=("app.js" "app.json" "package.json" "README.md" ".gitignore")
MISSING_FILES=()

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        size=$(du -sk "$file" | cut -f1)
        echo -e "${GREEN}✅ $file (${size} KB)${NC}"
        add_to_report "- ✅ $file (${size} KB)"
    else
        echo -e "${RED}❌ $file manquant${NC}"
        add_to_report "- ❌ $file manquant"
        MISSING_FILES+=("$file")
    fi
done

# 11) Test des scripts
echo -e "${YELLOW}11. TEST DES SCRIPTS${NC}"
echo "====================="

SCRIPTS_TO_TEST=("scripts/update-readme.sh" "scripts/cleanup-repo.sh" "scripts/sync-drivers.sh")

for script in "${SCRIPTS_TO_TEST[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            echo -e "${GREEN}✅ $script (exécutable)${NC}"
            add_to_report "- ✅ $script (exécutable)"
        else
            echo -e "${YELLOW}⚠️ $script (non exécutable)${NC}"
            add_to_report "- ⚠️ $script (non exécutable)"
        fi
    else
        echo -e "${RED}❌ $script manquant${NC}"
        add_to_report "- ❌ $script manquant"
    fi
done

# 12) Calcul du score de santé
echo -e "${YELLOW}12. CALCUL DU SCORE DE SANTÉ${NC}"
echo "==============================="

SCORE=0
TOTAL_TESTS=0

# Test des fichiers critiques
TOTAL_TESTS=$((TOTAL_TESTS + ${#CRITICAL_FILES[@]}))
for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        SCORE=$((SCORE + 1))
    fi
done

# Test des scripts
TOTAL_TESTS=$((TOTAL_TESTS + ${#SCRIPTS_TO_TEST[@]}))
for script in "${SCRIPTS_TO_TEST[@]}"; do
    if [ -f "$script" ] && [ -x "$script" ]; then
        SCORE=$((SCORE + 1))
    fi
done

# Test du dashboard
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -d "dashboard" ]; then
    SCORE=$((SCORE + 1))
fi

# Test Git
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ -d ".git" ]; then
    SCORE=$((SCORE + 1))
fi

# Calcul du pourcentage
if [ $TOTAL_TESTS -gt 0 ]; then
    HEALTH_PERCENT=$((SCORE * 100 / TOTAL_TESTS))
else
    HEALTH_PERCENT=0
fi

echo -e "${WHITE}Score de santé: $SCORE/$TOTAL_TESTS (${HEALTH_PERCENT}%)${NC}"

add_to_report ""
add_to_report "## 🏥 SCORE DE SANTÉ"
add_to_report ""
add_to_report "### Résultats"
add_to_report "- Score: $SCORE/$TOTAL_TESTS"
add_to_report "- Pourcentage: ${HEALTH_PERCENT}%"

# 13) Recommandations
echo -e "${YELLOW}13. RECOMMANDATIONS${NC}"
echo "====================="

RECOMMENDATIONS=()

if [ ${#MISSING_FILES[@]} -gt 0 ]; then
    RECOMMENDATIONS+=("Créer les fichiers manquants: ${MISSING_FILES[*]}")
fi

if [ $HEALTH_PERCENT -lt 80 ]; then
    RECOMMENDATIONS+=("Améliorer le score de santé (actuellement ${HEALTH_PERCENT}%)")
fi

if [ $DRIVER_COUNT -eq 0 ]; then
    RECOMMENDATIONS+=("Ajouter des drivers pour le support des devices")
fi

if [ $LANGUAGE_FILES -eq 0 ]; then
    RECOMMENDATIONS+=("Ajouter des fichiers de localisation")
fi

if [ ${#RECOMMENDATIONS[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ Aucune recommandation critique${NC}"
    add_to_report ""
    add_to_report "### Recommandations"
    add_to_report "- ✅ Aucune recommandation critique"
else
    echo -e "${YELLOW}📋 Recommandations:${NC}"
    for rec in "${RECOMMENDATIONS[@]}"; do
        echo -e "${WHITE}- $rec${NC}"
    done
    
    add_to_report ""
    add_to_report "### Recommandations"
    for rec in "${RECOMMENDATIONS[@]}"; do
        add_to_report "- $rec"
    done
fi

# 14) Rapport final
echo -e "${GREEN}📊 RAPPORT FINAL${NC}"
echo "==============="

add_to_report ""
add_to_report "## 📊 RÉSUMÉ"
add_to_report ""
add_to_report "### Métriques Clés"
add_to_report "- Taille du repository: ${REPO_SIZE} MB"
add_to_report "- Drivers supportés: $DRIVER_COUNT"
add_to_report "- Langues supportées: $LANGUAGE_FILES"
add_to_report "- Workflows: $WORKFLOW_COUNT"
add_to_report "- Score de santé: ${HEALTH_PERCENT}%"
add_to_report ""
add_to_report "### Timestamp"
add_to_report "- Date: $(date +%Y-%m-%d)"
add_to_report "- Heure: $(date +%H:%M:%S) UTC"
add_to_report "- Script: diagnostic-complet.sh"
add_to_report ""
add_to_report "---"
add_to_report ""
add_to_report "*Rapport généré automatiquement - Mode YOLO Intelligent*"

echo -e "${WHITE}Rapport généré: $REPORT_FILE${NC}"
echo -e "${WHITE}Score de santé: ${HEALTH_PERCENT}%${NC}"
echo -e "${WHITE}Timestamp: $(date +%Y-%m-%d %H:%M:%S UTC)${NC}"

if [ $HEALTH_PERCENT -ge 80 ]; then
    echo -e "${GREEN}✅ PROJET EN BONNE SANTÉ${NC}"
else
    echo -e "${YELLOW}⚠️ PROJET NÉCESSITE DES AMÉLIORATIONS${NC}"
fi

echo -e "${GREEN}DIAGNOSTIC TERMINÉ AVEC SUCCÈS !${NC}"
echo -e "${CYAN}Mode YOLO Intelligent activé - Optimisation continue${NC}" 