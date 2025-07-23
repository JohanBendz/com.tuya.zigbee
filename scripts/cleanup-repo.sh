#!/bin/bash

# CLEANUP REPO - Tuya Zigbee Project
# Script de nettoyage local pour optimiser le repo (Bash version)

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Variables
FORCE=false
DRY_RUN=false

# Fonction d'aide
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  -f, --force    Force cleanup"
    echo "  -d, --dry-run  Dry run mode"
    echo "  -h, --help     Show this help"
}

# Parsing des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--force)
            FORCE=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
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

echo -e "${CYAN}NETTOYAGE DU REPOSITORY${NC}"
echo "========================="

# 1) Analyse avant nettoyage
echo -e "${YELLOW}1. ANALYSE AVANT NETTOYAGE${NC}"
echo "=========================="

BEFORE_SIZE=$(du -sm . | cut -f1)
BEFORE_FILES=$(find . -type f | wc -l)

echo -e "${WHITE}Taille avant: ${BEFORE_SIZE} MB${NC}"
echo -e "${WHITE}Fichiers avant: $BEFORE_FILES${NC}"

# 2) Nettoyage des fichiers temporaires
echo -e "${YELLOW}2. NETTOYAGE FICHIERS TEMPORAIRES${NC}"
echo "================================="

TEMP_PATTERNS=("*.tmp" "*.temp" "*.cache" "*.bak" "*.old" "*.orig" "*.rej" "*.swp" "*.swo" "*~")
TEMP_FILES=()

for pattern in "${TEMP_PATTERNS[@]}"; do
    files=$(find . -name "$pattern" -type f 2>/dev/null)
    if [ -n "$files" ]; then
        count=$(echo "$files" | wc -l)
        echo -e "${WHITE}Trouvé $count fichiers $pattern${NC}"
        if [ "$DRY_RUN" = false ]; then
            echo "$files" | xargs rm -f 2>/dev/null
            echo -e "${GREEN}Supprimé $count fichiers $pattern${NC}"
        fi
    fi
done

# 3) Nettoyage des dossiers de build
echo -e "${YELLOW}3. NETTOYAGE DOSSIERS BUILD${NC}"
echo "============================"

BUILD_DIRS=("node_modules" "dist" "build" "out" ".next" ".nuxt" ".vercel" ".homeybuild" ".homeycompose/cache" ".homeycompose/temp" ".cache" ".temp" ".tmp")

for dir in "${BUILD_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        size=$(du -sm "$dir" 2>/dev/null | cut -f1 || echo "0")
        echo -e "${WHITE}Dossier $dir trouvé (${size} MB)${NC}"
        if [ "$DRY_RUN" = false ]; then
            rm -rf "$dir" 2>/dev/null
            echo -e "${GREEN}Supprimé $dir${NC}"
        fi
    fi
done

# 4) Nettoyage des fichiers de lock
echo -e "${YELLOW}4. NETTOYAGE FICHIERS LOCK${NC}"
echo "============================"

LOCK_FILES=("package-lock.json" "yarn.lock" "pnpm-lock.yaml")

for file in "${LOCK_FILES[@]}"; do
    if [ -f "$file" ]; then
        size=$(du -sk "$file" | cut -f1)
        echo -e "${WHITE}Fichier $file trouvé (${size} KB)${NC}"
        if [ "$DRY_RUN" = false ]; then
            rm -f "$file"
            echo -e "${GREEN}Supprimé $file${NC}"
        fi
    fi
done

# 5) Nettoyage des logs
echo -e "${YELLOW}5. NETTOYAGE LOGS${NC}"
echo "=================="

LOG_FILES=$(find . -name "*.log" -type f 2>/dev/null | grep -v "auto-update.log")
if [ -n "$LOG_FILES" ]; then
    count=$(echo "$LOG_FILES" | wc -l)
    echo -e "${WHITE}Trouvé $count fichiers log${NC}"
    if [ "$DRY_RUN" = false ]; then
        echo "$LOG_FILES" | xargs rm -f 2>/dev/null
        echo -e "${GREEN}Supprimé $count fichiers log${NC}"
    fi
fi

# 6) Nettoyage des archives
echo -e "${YELLOW}6. NETTOYAGE ARCHIVES${NC}"
echo "======================"

ARCHIVE_PATTERNS=("*.tar.gz" "*.zip" "*.7z" "*.rar")
ARCHIVE_FILES=()

for pattern in "${ARCHIVE_PATTERNS[@]}"; do
    files=$(find . -name "$pattern" -type f 2>/dev/null)
    if [ -n "$files" ]; then
        count=$(echo "$files" | wc -l)
        echo -e "${WHITE}Trouvé $count fichiers $pattern${NC}"
        if [ "$DRY_RUN" = false ]; then
            echo "$files" | xargs rm -f 2>/dev/null
            echo -e "${GREEN}Supprimé $count fichiers $pattern${NC}"
        fi
    fi
done

# 7) Nettoyage des dossiers d'archives
echo -e "${YELLOW}7. NETTOYAGE DOSSIERS ARCHIVES${NC}"
echo "================================="

ARCHIVE_DIRS=("archives" "backup_*" "restore_*" "intelligent-backup_*")

for dir_pattern in "${ARCHIVE_DIRS[@]}"; do
    found_dirs=$(find . -type d -name "$dir_pattern" 2>/dev/null)
    if [ -n "$found_dirs" ]; then
        while IFS= read -r found_dir; do
            if [ -d "$found_dir" ]; then
                size=$(du -sm "$found_dir" 2>/dev/null | cut -f1 || echo "0")
                dir_name=$(basename "$found_dir")
                echo -e "${WHITE}Dossier $dir_name trouvé (${size} MB)${NC}"
                if [ "$DRY_RUN" = false ]; then
                    rm -rf "$found_dir" 2>/dev/null
                    echo -e "${GREEN}Supprimé $dir_name${NC}"
                fi
            fi
        done <<< "$found_dirs"
    fi
done

# 8) Analyse après nettoyage
echo -e "${YELLOW}8. ANALYSE APRÈS NETTOYAGE${NC}"
echo "==========================="

AFTER_SIZE=$(du -sm . | cut -f1)
AFTER_FILES=$(find . -type f | wc -l)

echo -e "${WHITE}Taille après: ${AFTER_SIZE} MB${NC}"
echo -e "${WHITE}Fichiers après: $AFTER_FILES${NC}"

# 9) Calcul des économies
echo -e "${YELLOW}9. CALCUL ÉCONOMIES${NC}"
echo "==================="

SIZE_SAVED=$((BEFORE_SIZE - AFTER_SIZE))
FILES_SAVED=$((BEFORE_FILES - AFTER_FILES))

if [ $BEFORE_SIZE -gt 0 ]; then
    PERCENT_SIZE=$((SIZE_SAVED * 100 / BEFORE_SIZE))
else
    PERCENT_SIZE=0
fi

if [ $BEFORE_FILES -gt 0 ]; then
    PERCENT_FILES=$((FILES_SAVED * 100 / BEFORE_FILES))
else
    PERCENT_FILES=0
fi

echo -e "${GREEN}Taille économisée: ${SIZE_SAVED} MB (${PERCENT_SIZE}%)${NC}"
echo -e "${GREEN}Fichiers supprimés: $FILES_SAVED (${PERCENT_FILES}%)${NC}"

# 10) Rapport final
echo -e "${GREEN}📊 RAPPORT FINAL${NC}"
echo "==============="
echo -e "${WHITE}Taille avant: ${BEFORE_SIZE} MB${NC}"
echo -e "${WHITE}Taille après: ${AFTER_SIZE} MB${NC}"
echo -e "${GREEN}Économie: ${SIZE_SAVED} MB (${PERCENT_SIZE}%)${NC}"
echo -e "${GREEN}Fichiers supprimés: $FILES_SAVED (${PERCENT_FILES}%)${NC}"

if [ "$DRY_RUN" = false ]; then
    echo -e "${GREEN}✅ NETTOYAGE TERMINÉ AVEC SUCCÈS${NC}"
    echo -e "${CYAN}📊 Repo optimisé pour la communauté Homey${NC}"
else
    echo -e "${YELLOW}🔍 Mode DryRun - Aucune modification effectuée${NC}"
fi

echo -e "${WHITE}⏰ Timestamp: $(date +%Y-%m-%d %H:%M:%S UTC)${NC}" 