#!/bin/bash

# RUN UNIVERSAL - Tuya Zigbee Project
# Script de lancement universel avec détection automatique du shell

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Variables
SCRIPT_NAME=""
DRY_RUN=false
FORCE=false

# Fonction d'aide
show_help() {
    echo "Usage: $0 [SCRIPT] [OPTIONS]"
    echo ""
    echo "Scripts disponibles:"
    echo "  update-readme     Mise à jour automatique du README"
    echo "  cleanup-repo      Nettoyage du repository"
    echo "  sync-drivers      Synchronisation des drivers"
    echo "  setup-auto-readme Configuration auto README"
    echo "  diagnostic        Diagnostic complet du projet"
    echo "  validation        Validation finale du projet"
    echo "  compatibilite     Test de compatibilité PowerShell/Bash"
    echo ""
    echo "Options:"
    echo "  -d, --dry-run     Mode dry-run"
    echo "  -f, --force       Mode force"
    echo "  -h, --help        Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0 update-readme --dry-run"
    echo "  $0 cleanup-repo --force"
    echo "  $0 diagnostic"
}

# Fonction de détection du shell
detect_shell() {
    if command -v pwsh >/dev/null 2>&1; then
        echo "powershell"
    elif command -v powershell >/dev/null 2>&1; then
        echo "powershell"
    elif command -v bash >/dev/null 2>&1; then
        echo "bash"
    elif command -v sh >/dev/null 2>&1; then
        echo "sh"
    else
        echo "unknown"
    fi
}

# Fonction de lancement de script
run_script() {
    local script_name="$1"
    local shell_type="$2"
    local args="$3"
    
    case $shell_type in
        "powershell")
            if [ -f "scripts/${script_name}.ps1" ]; then
                echo -e "${GREEN}Lancement avec PowerShell: ${script_name}.ps1${NC}"
                pwsh -File "scripts/${script_name}.ps1" $args
                return $?
            else
                echo -e "${RED}Script PowerShell non trouvé: ${script_name}.ps1${NC}"
                return 1
            fi
            ;;
        "bash"|"sh")
            if [ -f "scripts/${script_name}.sh" ]; then
                echo -e "${GREEN}Lancement avec Bash: ${script_name}.sh${NC}"
                bash "scripts/${script_name}.sh" $args
                return $?
            else
                echo -e "${RED}Script Bash non trouvé: ${script_name}.sh${NC}"
                return 1
            fi
            ;;
        *)
            echo -e "${RED}Shell non supporté: $shell_type${NC}"
            return 1
            ;;
    esac
}

# Parsing des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        update-readme|cleanup-repo|sync-drivers|setup-auto-readme|diagnostic|validation|compatibilite)
            SCRIPT_NAME="$1"
            shift
            ;;
        *)
            echo "Option inconnue: $1"
            show_help
            exit 1
            ;;
    esac
done

# Vérification du script demandé
if [ -z "$SCRIPT_NAME" ]; then
    echo -e "${RED}❌ Aucun script spécifié${NC}"
    show_help
    exit 1
fi

echo -e "${CYAN}LANCEMENT UNIVERSEL - Tuya Zigbee Project${NC}"
echo "============================================="

# Détection du shell
SHELL_TYPE=$(detect_shell)
echo -e "${WHITE}Shell détecté: $SHELL_TYPE${NC}"

# Construction des arguments
ARGS=""
if [ "$DRY_RUN" = true ]; then
    ARGS="$ARGS --dry-run"
fi
if [ "$FORCE" = true ]; then
    ARGS="$ARGS --force"
fi

# Mapping des noms de scripts
case $SCRIPT_NAME in
    "update-readme")
        ACTUAL_SCRIPT="update-readme"
        ;;
    "cleanup-repo")
        ACTUAL_SCRIPT="cleanup-repo"
        ;;
    "sync-drivers")
        ACTUAL_SCRIPT="sync-drivers"
        ;;
    "setup-auto-readme")
        ACTUAL_SCRIPT="setup-auto-readme"
        ;;
    "diagnostic")
        ACTUAL_SCRIPT="diagnostic-complet"
        ;;
    "validation")
        ACTUAL_SCRIPT="validation-finale"
        ;;
    "compatibilite")
        ACTUAL_SCRIPT="test-compatibilite"
        ;;
    *)
        echo -e "${RED}❌ Script inconnu: $SCRIPT_NAME${NC}"
        exit 1
        ;;
esac

echo -e "${WHITE}Script demandé: $SCRIPT_NAME${NC}"
echo -e "${WHITE}Arguments: $ARGS${NC}"

# Lancement du script
echo -e "${YELLOW}Lancement en cours...${NC}"
if run_script "$ACTUAL_SCRIPT" "$SHELL_TYPE" "$ARGS"; then
    echo -e "${GREEN}✅ Script exécuté avec succès${NC}"
    exit 0
else
    echo -e "${RED}❌ Erreur lors de l'exécution du script${NC}"
    exit 1
fi 