#!/bin/bash

# VALIDATION FINALE - Tuya Zigbee Project
# Script de validation finale du projet (Bash version)

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Variables
VALIDATION_REPORT="VALIDATION-FINALE-$(date +%Y%m%d-%H%M%S).md"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo -e "${CYAN}VALIDATION FINALE DU PROJET${NC}"
echo "============================="

# Fonction pour ajouter au rapport
add_to_report() {
    echo "$1" >> "$VALIDATION_REPORT"
}

# Fonction pour tester un élément
test_item() {
    local test_name="$1"
    local test_command="$2"
    local success_message="$3"
    local failure_message="$4"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $test_name${NC}"
        add_to_report "- ✅ $test_name"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}❌ $test_name${NC}"
        add_to_report "- ❌ $test_name"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# Initialiser le rapport
cat > "$VALIDATION_REPORT" << EOF
# VALIDATION FINALE - Tuya Zigbee Project

## 🧪 TESTS DE VALIDATION

EOF

# 1) Validation de la structure du projet
echo -e "${YELLOW}1. VALIDATION DE LA STRUCTURE${NC}"
echo "==============================="

test_item "Repository Git initialisé" "[ -d '.git' ]" "Repository Git valide" "Repository Git manquant"
test_item "Fichier app.js présent" "[ -f 'app.js' ]" "app.js trouvé" "app.js manquant"
test_item "Fichier app.json présent" "[ -f 'app.json' ]" "app.json trouvé" "app.json manquant"
test_item "Fichier package.json présent" "[ -f 'package.json' ]" "package.json trouvé" "package.json manquant"
test_item "Fichier README.md présent" "[ -f 'README.md' ]" "README.md trouvé" "README.md manquant"
test_item "Fichier .gitignore présent" "[ -f '.gitignore' ]" ".gitignore trouvé" ".gitignore manquant"

# 2) Validation des scripts
echo -e "${YELLOW}2. VALIDATION DES SCRIPTS${NC}"
echo "========================="

test_item "Script update-readme.sh présent" "[ -f 'scripts/update-readme.sh' ]" "update-readme.sh trouvé" "update-readme.sh manquant"
test_item "Script cleanup-repo.sh présent" "[ -f 'scripts/cleanup-repo.sh' ]" "cleanup-repo.sh trouvé" "cleanup-repo.sh manquant"
test_item "Script sync-drivers.sh présent" "[ -f 'scripts/sync-drivers.sh' ]" "sync-drivers.sh trouvé" "sync-drivers.sh manquant"
test_item "Script setup-auto-readme.sh présent" "[ -f 'scripts/setup-auto-readme.sh' ]" "setup-auto-readme.sh trouvé" "setup-auto-readme.sh manquant"
test_item "Script diagnostic-complet.sh présent" "[ -f 'scripts/diagnostic-complet.sh' ]" "diagnostic-complet.sh trouvé" "diagnostic-complet.sh manquant"

# 3) Validation des scripts exécutables
echo -e "${YELLOW}3. VALIDATION DES SCRIPTS EXÉCUTABLES${NC}"
echo "====================================="

test_item "update-readme.sh exécutable" "[ -x 'scripts/update-readme.sh' ]" "update-readme.sh exécutable" "update-readme.sh non exécutable"
test_item "cleanup-repo.sh exécutable" "[ -x 'scripts/cleanup-repo.sh' ]" "cleanup-repo.sh exécutable" "cleanup-repo.sh non exécutable"
test_item "sync-drivers.sh exécutable" "[ -x 'scripts/sync-drivers.sh' ]" "sync-drivers.sh exécutable" "sync-drivers.sh non exécutable"
test_item "setup-auto-readme.sh exécutable" "[ -x 'scripts/setup-auto-readme.sh' ]" "setup-auto-readme.sh exécutable" "setup-auto-readme.sh non exécutable"
test_item "diagnostic-complet.sh exécutable" "[ -x 'scripts/diagnostic-complet.sh' ]" "diagnostic-complet.sh exécutable" "diagnostic-complet.sh non exécutable"

# 4) Validation des dossiers
echo -e "${YELLOW}4. VALIDATION DES DOSSIERS${NC}"
echo "========================="

test_item "Dossier drivers présent" "[ -d 'drivers' ]" "Dossier drivers trouvé" "Dossier drivers manquant"
test_item "Dossier scripts présent" "[ -d 'scripts' ]" "Dossier scripts trouvé" "Dossier scripts manquant"
test_item "Dossier locales présent" "[ -d 'locales' ]" "Dossier locales trouvé" "Dossier locales manquant"
test_item "Dossier assets présent" "[ -d 'assets' ]" "Dossier assets trouvé" "Dossier assets manquant"
test_item "Dossier dashboard présent" "[ -d 'dashboard' ]" "Dossier dashboard trouvé" "Dossier dashboard manquant"

# 5) Validation des workflows
echo -e "${YELLOW}5. VALIDATION DES WORKFLOWS${NC}"
echo "==============================="

test_item "Dossier workflows présent" "[ -d '.github/workflows' ]" "Dossier workflows trouvé" "Dossier workflows manquant"
test_item "Workflow cleanup présent" "[ -f '.github/workflows/cleanup.yml' ]" "Workflow cleanup trouvé" "Workflow cleanup manquant"
test_item "Workflow cleanup mensuel présent" "[ -f '.github/workflows/cleanup-monthly.yml' ]" "Workflow cleanup mensuel trouvé" "Workflow cleanup mensuel manquant"

# 6) Validation des fichiers de configuration
echo -e "${YELLOW}6. VALIDATION DES FICHIERS DE CONFIGURATION${NC}"
echo "============================================="

test_item "Fichier app.json valide JSON" "jq empty app.json" "app.json JSON valide" "app.json JSON invalide"
test_item "Fichier package.json valide JSON" "jq empty package.json" "package.json JSON valide" "package.json JSON invalide"

# 7) Validation des métriques
echo -e "${YELLOW}7. VALIDATION DES MÉTRIQUES${NC}"
echo "============================="

DRIVER_COUNT=$(find drivers -name "*.js" -type f 2>/dev/null | wc -l)
LANGUAGE_FILES=$(find locales -name "*.json" -o -name "*.md" 2>/dev/null | wc -l)
WORKFLOW_COUNT=$(find .github/workflows -name "*.yml" -o -name "*.yaml" 2>/dev/null | wc -l)

test_item "Au moins 1 driver présent" "[ $DRIVER_COUNT -gt 0 ]" "Drivers trouvés: $DRIVER_COUNT" "Aucun driver trouvé"
test_item "Au moins 1 fichier de langue présent" "[ $LANGUAGE_FILES -gt 0 ]" "Fichiers de langue trouvés: $LANGUAGE_FILES" "Aucun fichier de langue trouvé"
test_item "Au moins 1 workflow présent" "[ $WORKFLOW_COUNT -gt 0 ]" "Workflows trouvés: $WORKFLOW_COUNT" "Aucun workflow trouvé"

# 8) Validation des hooks Git
echo -e "${YELLOW}8. VALIDATION DES HOOKS GIT${NC}"
echo "==============================="

test_item "Hook pre-commit présent" "[ -f '.git/hooks/pre-commit' ]" "Hook pre-commit trouvé" "Hook pre-commit manquant"
test_item "Hook pre-commit exécutable" "[ -x '.git/hooks/pre-commit' ]" "Hook pre-commit exécutable" "Hook pre-commit non exécutable"

# 9) Test de fonctionnement des scripts
echo -e "${YELLOW}9. TEST DE FONCTIONNEMENT DES SCRIPTS${NC}"
echo "========================================="

test_item "Script update-readme.sh fonctionnel" "bash scripts/update-readme.sh --dry-run > /dev/null 2>&1" "update-readme.sh fonctionnel" "update-readme.sh défaillant"
test_item "Script cleanup-repo.sh fonctionnel" "bash scripts/cleanup-repo.sh --dry-run > /dev/null 2>&1" "cleanup-repo.sh fonctionnel" "cleanup-repo.sh défaillant"
test_item "Script diagnostic-complet.sh fonctionnel" "bash scripts/diagnostic-complet.sh > /dev/null 2>&1" "diagnostic-complet.sh fonctionnel" "diagnostic-complet.sh défaillant"

# 10) Validation de la taille du repo
echo -e "${YELLOW}10. VALIDATION DE LA TAILLE DU REPO${NC}"
echo "====================================="

REPO_SIZE=$(du -sm . | cut -f1)
test_item "Taille du repo inférieure à 1000 MB" "[ $REPO_SIZE -lt 1000 ]" "Taille repo OK: ${REPO_SIZE} MB" "Taille repo trop importante: ${REPO_SIZE} MB"

# Calcul des résultats
echo -e "${YELLOW}11. CALCUL DES RÉSULTATS${NC}"
echo "============================="

if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
else
    SUCCESS_RATE=0
fi

echo -e "${WHITE}Tests totaux: $TOTAL_TESTS${NC}"
echo -e "${GREEN}Tests réussis: $PASSED_TESTS${NC}"
echo -e "${RED}Tests échoués: $FAILED_TESTS${NC}"
echo -e "${WHITE}Taux de réussite: ${SUCCESS_RATE}%${NC}"

# Génération du rapport final
add_to_report ""
add_to_report "## 📊 RÉSULTATS FINAUX"
add_to_report ""
add_to_report "### Statistiques"
add_to_report "- Tests totaux: $TOTAL_TESTS"
add_to_report "- Tests réussis: $PASSED_TESTS"
add_to_report "- Tests échoués: $FAILED_TESTS"
add_to_report "- Taux de réussite: ${SUCCESS_RATE}%"
add_to_report ""
add_to_report "### Métriques"
add_to_report "- Drivers supportés: $DRIVER_COUNT"
add_to_report "- Langues supportées: $LANGUAGE_FILES"
add_to_report "- Workflows: $WORKFLOW_COUNT"
add_to_report "- Taille repo: ${REPO_SIZE} MB"
add_to_report ""
add_to_report "### Timestamp"
add_to_report "- Date: $(date +%Y-%m-%d)"
add_to_report "- Heure: $(date +%H:%M:%S) UTC"
add_to_report "- Script: validation-finale.sh"
add_to_report ""
add_to_report "---"
add_to_report ""
add_to_report "*Rapport généré automatiquement - Mode YOLO Intelligent*"

# Conclusion
echo -e "${GREEN}📊 RAPPORT FINAL${NC}"
echo "==============="
echo -e "${WHITE}Rapport généré: $VALIDATION_REPORT${NC}"
echo -e "${WHITE}Taux de réussite: ${SUCCESS_RATE}%${NC}"
echo -e "${WHITE}Timestamp: $(date +%Y-%m-%d %H:%M:%S UTC)${NC}"

if [ $SUCCESS_RATE -ge 90 ]; then
    echo -e "${GREEN}✅ VALIDATION EXCELLENTE${NC}"
    echo -e "${CYAN}🎉 Projet prêt pour la production${NC}"
elif [ $SUCCESS_RATE -ge 80 ]; then
    echo -e "${GREEN}✅ VALIDATION BONNE${NC}"
    echo -e "${CYAN}⚠️ Quelques améliorations recommandées${NC}"
elif [ $SUCCESS_RATE -ge 70 ]; then
    echo -e "${YELLOW}⚠️ VALIDATION MOYENNE${NC}"
    echo -e "${CYAN}🔧 Améliorations nécessaires${NC}"
else
    echo -e "${RED}❌ VALIDATION INSUFFISANTE${NC}"
    echo -e "${CYAN}🚨 Corrections critiques requises${NC}"
fi

echo -e "${GREEN}VALIDATION FINALE TERMINÉE !${NC}"
echo -e "${CYAN}Mode YOLO Intelligent activé - Optimisation continue${NC}" 