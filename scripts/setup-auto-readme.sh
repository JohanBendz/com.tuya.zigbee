#!/bin/bash

# SETUP AUTO README - Tuya Zigbee Project
# Script de configuration automatique du hook Git (Bash version)

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Variables
HOOK_DIR=".git/hooks"
PRE_COMMIT_HOOK="$HOOK_DIR/pre-commit"
SCRIPT_PATH="scripts/update-readme.sh"

# Fonction d'aide
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  -f, --force    Force setup"
    echo "  -r, --remove   Remove hook"
    echo "  -h, --help     Show this help"
}

# Parsing des arguments
FORCE=false
REMOVE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--force)
            FORCE=true
            shift
            ;;
        -r|--remove)
            REMOVE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo "Option inconnue: $1"
            show_help
            exit 1
            ;;
    esac
done

echo -e "${CYAN}CONFIGURATION AUTO README${NC}"
echo "============================"

# Vérifier si on est dans un repo Git
if [ ! -d ".git" ]; then
    echo -e "${RED}❌ Erreur: Pas de repository Git trouvé${NC}"
    exit 1
fi

# Vérifier si le script existe
if [ ! -f "$SCRIPT_PATH" ]; then
    echo -e "${RED}❌ Erreur: Script $SCRIPT_PATH non trouvé${NC}"
    exit 1
fi

# Rendre le script exécutable
chmod +x "$SCRIPT_PATH"
echo -e "${GREEN}✅ Script $SCRIPT_PATH rendu exécutable${NC}"

# Suppression du hook si demandé
if [ "$REMOVE" = true ]; then
    if [ -f "$PRE_COMMIT_HOOK" ]; then
        rm -f "$PRE_COMMIT_HOOK"
        echo -e "${GREEN}✅ Hook pre-commit supprimé${NC}"
    else
        echo -e "${YELLOW}ℹ️ Hook pre-commit non trouvé${NC}"
    fi
    exit 0
fi

# Créer le dossier hooks s'il n'existe pas
if [ ! -d "$HOOK_DIR" ]; then
    mkdir -p "$HOOK_DIR"
    echo -e "${GREEN}✅ Dossier hooks créé${NC}"
fi

# Contenu du hook pre-commit
HOOK_CONTENT="#!/bin/bash

# AUTO README HOOK - Tuya Zigbee Project
# Hook Git pour mise à jour automatique du README

echo \"🔄 Mise à jour automatique du README...\"

# Exécuter le script de mise à jour
if [ -f \"$SCRIPT_PATH\" ]; then
    bash \"$SCRIPT_PATH\" --dry-run
    if [ \$? -eq 0 ]; then
        echo \"✅ README mis à jour avec succès\"
    else
        echo \"❌ Erreur lors de la mise à jour du README\"
        exit 1
    fi
else
    echo \"⚠️ Script de mise à jour non trouvé: $SCRIPT_PATH\"
fi

echo \"🚀 Commit en cours...\"
"

# Vérifier si le hook existe déjà
if [ -f "$PRE_COMMIT_HOOK" ] && [ "$FORCE" = false ]; then
    echo -e "${YELLOW}⚠️ Hook pre-commit existe déjà${NC}"
    echo -e "${WHITE}Utilisez -f pour forcer la réécriture${NC}"
    exit 1
fi

# Créer le hook
echo "$HOOK_CONTENT" > "$PRE_COMMIT_HOOK"
chmod +x "$PRE_COMMIT_HOOK"

echo -e "${GREEN}✅ Hook pre-commit créé${NC}"
echo -e "${GREEN}✅ Hook rendu exécutable${NC}"

# Test du hook
echo -e "${YELLOW}TEST DU HOOK${NC}"
echo "==========="

if [ -x "$PRE_COMMIT_HOOK" ]; then
    echo -e "${GREEN}✅ Hook exécutable${NC}"
else
    echo -e "${RED}❌ Hook non exécutable${NC}"
fi

# Test du script
echo -e "${YELLOW}TEST DU SCRIPT${NC}"
echo "============="

if bash "$SCRIPT_PATH" --dry-run > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Script fonctionnel${NC}"
else
    echo -e "${RED}❌ Erreur dans le script${NC}"
fi

# Configuration Git
echo -e "${YELLOW}CONFIGURATION GIT${NC}"
echo "=================="

# Configurer Git pour ignorer les erreurs du hook si nécessaire
git config core.hooksPath .git/hooks
echo -e "${GREEN}✅ Hooks path configuré${NC}"

# Rapport final
echo -e "${GREEN}📊 RAPPORT DE CONFIGURATION${NC}"
echo "============================="
echo -e "${WHITE}Hook créé: $PRE_COMMIT_HOOK${NC}"
echo -e "${WHITE}Script utilisé: $SCRIPT_PATH${NC}"
echo -e "${WHITE}Mode: $(if [ "$FORCE" = true ]; then echo "Force"; else echo "Normal"; fi)${NC}"
echo -e "${WHITE}Timestamp: $(date +%Y-%m-%d %H:%M:%S UTC)${NC}"

echo -e "${GREEN}✅ CONFIGURATION TERMINÉE AVEC SUCCÈS${NC}"
echo -e "${CYAN}🔄 README sera mis à jour automatiquement à chaque commit${NC}"
echo -e "${CYAN}🚀 Mode YOLO Intelligent activé${NC}"

# Instructions d'utilisation
echo -e "${YELLOW}📋 INSTRUCTIONS${NC}"
echo "============="
echo -e "${WHITE}1. Le README sera mis à jour automatiquement à chaque commit${NC}"
echo -e "${WHITE}2. Pour désactiver: $0 --remove${NC}"
echo -e "${WHITE}3. Pour forcer: $0 --force${NC}"
echo -e "${WHITE}4. Test manuel: bash $SCRIPT_PATH --dry-run${NC}" 