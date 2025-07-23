#!/bin/bash

# TEST COMPATIBILITÉ - Tuya Zigbee Project
# Script de test de compatibilité entre PowerShell et Bash

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Variables
PS_SCRIPTS=()
SH_SCRIPTS=()
MISSING_SH=()
MISSING_PS=()

echo -e "${CYAN}TEST DE COMPATIBILITÉ POWERSHELL/BASH${NC}"
echo "=========================================="
echo ""

# 1) Analyse des scripts PowerShell
echo -e "${YELLOW}1. ANALYSE DES SCRIPTS POWERSHELL${NC}"
echo "====================================="
echo ""

for ps_script in scripts/*.ps1; do
    if [ -f "$ps_script" ]; then
        PS_SCRIPTS+=("$(basename "$ps_script")")
        echo -e "${GREEN}✅ $ps_script${NC}"
    fi
done
echo ""

# 2) Analyse des scripts Bash
echo -e "${YELLOW}2. ANALYSE DES SCRIPTS BASH${NC}"
echo "==============================="
echo ""

for sh_script in scripts/*.sh; do
    if [ -f "$sh_script" ]; then
        SH_SCRIPTS+=("$(basename "$sh_script")")
        echo -e "${GREEN}✅ $sh_script${NC}"
    fi
done
echo ""

# 3) Comparaison et identification des manquants
echo -e "${YELLOW}3. COMPARAISON DES SCRIPTS${NC}"
echo "============================="
echo ""

# Scripts PowerShell avec leurs équivalents Bash
declare -A PS_TO_SH=(
    ["update-readme.ps1"]="update-readme.sh"
    ["cleanup-repo.ps1"]="cleanup-repo.sh"
    ["sync-drivers.ps1"]="sync-drivers.sh"
    ["setup-auto-readme.ps1"]="setup-auto-readme.sh"
    ["diagnostic-complet.ps1"]="diagnostic-complet.sh"
    ["validation-finale.ps1"]="validation-finale.sh"
    ["test-compatibilite.ps1"]="test-compatibilite.sh"
    ["run-universal.ps1"]="run-universal.sh"
)

# Vérifier les équivalents manquants
for ps_script in "${!PS_TO_SH[@]}"; do
    sh_equivalent="${PS_TO_SH[$ps_script]}"
    
    if [ -f "scripts/$ps_script" ]; then
        if [ -f "scripts/$sh_equivalent" ]; then
            echo -e "${GREEN}✅ $ps_script ↔ $sh_equivalent${NC}"
        else
            echo -e "${RED}❌ $ps_script → $sh_equivalent (manquant)${NC}"
            MISSING_SH+=("$sh_equivalent")
        fi
    else
        if [ -f "scripts/$sh_equivalent" ]; then
            echo -e "${YELLOW}⚠️ $ps_script (manquant) ↔ $sh_equivalent${NC}"
            MISSING_PS+=("$ps_script")
        fi
    fi
done
echo ""

# 4) Test de fonctionnement des scripts Bash
echo -e "${YELLOW}4. TEST DE FONCTIONNEMENT BASH${NC}"
echo "================================="
echo ""

for sh_script in scripts/*.sh; do
    if [ -f "$sh_script" ]; then
        script_name=$(basename "$sh_script")
        echo -e "${WHITE}Test de $script_name...${NC}"
        
        # Test avec --help si disponible
        if bash "$sh_script" --help > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $script_name - Aide disponible${NC}"
        elif bash "$sh_script" --dry-run > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $script_name - Mode dry-run OK${NC}"
        elif bash "$sh_script" -h > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $script_name - Aide disponible${NC}"
        else
            echo -e "${YELLOW}⚠️ $script_name - Test basique${NC}"
        fi
        sleep 0.05
    fi
done
echo ""

# 5) Génération du rapport de compatibilité
echo -e "${YELLOW}5. RAPPORT DE COMPATIBILITÉ${NC}"
echo "================================="
echo ""

REPORT_FILE="COMPATIBILITE-REPORT-$(date +%Y%m%d-%H%M%S).md"

cat > "$REPORT_FILE" << EOF
# RAPPORT DE COMPATIBILITÉ POWERSHELL/BASH

## 📊 ÉQUIVALENCES DE SCRIPTS

### Scripts PowerShell
EOF

for ps_script in "${PS_SCRIPTS[@]}"; do
    echo "- $ps_script" >> "$REPORT_FILE"
done

echo "" >> "$REPORT_FILE"
echo "### Scripts Bash" >> "$REPORT_FILE"

for sh_script in "${SH_SCRIPTS[@]}"; do
    echo "- $sh_script" >> "$REPORT_FILE"
done

echo "" >> "$REPORT_FILE"
echo "### Correspondances" >> "$REPORT_FILE"

for ps_script in "${!PS_TO_SH[@]}"; do
    sh_equivalent="${PS_TO_SH[$ps_script]}"
    if [ -f "scripts/$ps_script" ] && [ -f "scripts/$sh_equivalent" ]; then
        echo "- ✅ $ps_script ↔ $sh_equivalent" >> "$REPORT_FILE"
    elif [ -f "scripts/$ps_script" ]; then
        echo "- ❌ $ps_script → $sh_equivalent (manquant)" >> "$REPORT_FILE"
    elif [ -f "scripts/$sh_equivalent" ]; then
        echo "- ⚠️ $ps_script (manquant) ↔ $sh_equivalent" >> "$REPORT_FILE"
    fi
done

echo "" >> "$REPORT_FILE"
echo "## 📈 STATISTIQUES" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "- Scripts PowerShell: ${#PS_SCRIPTS[@]}" >> "$REPORT_FILE"
echo "- Scripts Bash: ${#SH_SCRIPTS[@]}" >> "$REPORT_FILE"
echo "- Équivalents manquants Bash: ${#MISSING_SH[@]}" >> "$REPORT_FILE"
echo "- Scripts PowerShell manquants: ${#MISSING_PS[@]}" >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "## 🎯 RECOMMANDATIONS" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ ${#MISSING_SH[@]} -eq 0 ] && [ ${#MISSING_PS[@]} -eq 0 ]; then
    echo "- ✅ Compatibilité parfaite entre PowerShell et Bash" >> "$REPORT_FILE"
    echo "- ✅ Tous les scripts ont leurs équivalents" >> "$REPORT_FILE"
else
    if [ ${#MISSING_SH[@]} -gt 0 ]; then
        echo "- ❌ Créer les équivalents Bash manquants:" >> "$REPORT_FILE"
        for missing in "${MISSING_SH[@]}"; do
            echo "  - $missing" >> "$REPORT_FILE"
        done
    fi
    
    if [ ${#MISSING_PS[@]} -gt 0 ]; then
        echo "- ⚠️ Scripts PowerShell manquants:" >> "$REPORT_FILE"
        for missing in "${MISSING_PS[@]}"; do
            echo "  - $missing" >> "$REPORT_FILE"
        done
    fi
fi

echo "" >> "$REPORT_FILE"
echo "## 📅 TIMESTAMP" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "- Date: $(date +%Y-%m-%d)" >> "$REPORT_FILE"
echo "- Heure: $(date +%H:%M:%S) UTC" >> "$REPORT_FILE"
echo "- Script: test-compatibilite.sh" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "*Rapport généré automatiquement - Mode YOLO Intelligent*" >> "$REPORT_FILE"

# 6) Résumé final
echo -e "${GREEN}📊 RÉSUMÉ FINAL${NC}"
echo "==============="
echo -e "${WHITE}Scripts PowerShell: ${#PS_SCRIPTS[@]}${NC}"
echo -e "${WHITE}Scripts Bash: ${#SH_SCRIPTS[@]}${NC}"
echo -e "${WHITE}Équivalents manquants: ${#MISSING_SH[@]}${NC}"
echo -e "${WHITE}Rapport généré: $REPORT_FILE${NC}"
echo ""

if [ ${#MISSING_SH[@]} -eq 0 ]; then
    echo -e "${GREEN}✅ COMPATIBILITÉ PARFAITE${NC}"
    echo -e "${CYAN}🎉 Tous les scripts ont leurs équivalents${NC}"
    echo ""
else
    echo -e "${YELLOW}⚠️ COMPATIBILITÉ PARTIELLE${NC}"
    echo -e "${CYAN}🔧 ${#MISSING_SH[@]} équivalents Bash manquants${NC}"
    echo ""
fi

echo -e "${GREEN}TEST DE COMPATIBILITÉ TERMINÉ !${NC}"
echo -e "${CYAN}Mode YOLO Intelligent activé - Compatibilité cross-platform${NC}"
echo "" 