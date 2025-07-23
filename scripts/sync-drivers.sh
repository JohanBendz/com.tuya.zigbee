#!/bin/bash

# SYNC DRIVERS - Tuya Zigbee Project
# Script de synchronisation des drivers (Bash version)

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Variables
TEMPLATE_PATH="templates/driver.compose.json"

# Fonction d'aide
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  -t, --template PATH  Template path (default: templates/driver.compose.json)"
    echo "  -h, --help          Show this help"
}

# Parsing des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--template)
            TEMPLATE_PATH="$2"
            shift 2
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

echo -e "${CYAN}SYNCHRONISATION DES DRIVERS${NC}"

# Vérifier si le template existe
if [ ! -f "$TEMPLATE_PATH" ]; then
    echo -e "${RED}Template non trouvé: $TEMPLATE_PATH${NC}"
    exit 1
fi

# Parcourir tous les dossiers de drivers
for driver_dir in drivers/*/; do
    if [ -d "$driver_dir" ]; then
        driver_name=$(basename "$driver_dir")
        driver_compose_path="$driver_dir/driver.compose.json"
        
        if [ ! -f "$driver_compose_path" ]; then
            echo -e "${YELLOW}Copie du template vers $driver_name${NC}"
            cp "$TEMPLATE_PATH" "$driver_compose_path"
            echo -e "${GREEN}✅ $driver_name - Template copié${NC}"
        else
            echo -e "${WHITE}ℹ️ $driver_name - Template déjà présent${NC}"
        fi
    fi
done

echo -e "${GREEN}SYNCHRONISATION TERMINÉE${NC}" 