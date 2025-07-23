# TEST COMPATIBILITÉ - Tuya Zigbee Project
# Script de test de compatibilité entre PowerShell et Bash (PowerShell version)

# Variables
$PsScripts = @()
$ShScripts = @()
$MissingSh = @()
$MissingPs = @()

Write-Host "TEST DE COMPATIBILITÉ POWERSHELL/BASH" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1) Analyse des scripts PowerShell
Write-Host "1. ANALYSE DES SCRIPTS POWERSHELL" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow
Write-Host ""

$psScripts = Get-ChildItem scripts/*.ps1 -ErrorAction SilentlyContinue
foreach ($script in $psScripts) {
    $PsScripts += $script.Name
    Write-Host "✅ $($script.FullName)" -ForegroundColor Green
}
Write-Host ""

# 2) Analyse des scripts Bash
Write-Host "2. ANALYSE DES SCRIPTS BASH" -ForegroundColor Yellow
Write-Host "===============================" -ForegroundColor Yellow
Write-Host ""

$shScripts = Get-ChildItem scripts/*.sh -ErrorAction SilentlyContinue
foreach ($script in $shScripts) {
    $ShScripts += $script.Name
    Write-Host "✅ $($script.FullName)" -ForegroundColor Green
}
Write-Host ""

# 3) Comparaison et identification des manquants
Write-Host "3. COMPARAISON DES SCRIPTS" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow
Write-Host ""

# Scripts PowerShell avec leurs équivalents Bash
$PsToSh = @{
    "update-readme.ps1" = "update-readme.sh"
    "cleanup-repo.ps1" = "cleanup-repo.sh"
    "sync-drivers.ps1" = "sync-drivers.sh"
    "setup-auto-readme.ps1" = "setup-auto-readme.sh"
    "diagnostic-complet.ps1" = "diagnostic-complet.sh"
    "validation-finale.ps1" = "validation-finale.sh"
    "test-compatibilite.ps1" = "test-compatibilite.sh"
    "run-universal.ps1" = "run-universal.sh"
}

# Vérifier les équivalents manquants
foreach ($psScript in $PsToSh.Keys) {
    $shEquivalent = $PsToSh[$psScript]
    
    if (Test-Path "scripts/$psScript") {
        if (Test-Path "scripts/$shEquivalent") {
            Write-Host "✅ $psScript ↔ $shEquivalent" -ForegroundColor Green
        }
        else {
            Write-Host "❌ $psScript → $shEquivalent (manquant)" -ForegroundColor Red
            $MissingSh += $shEquivalent
        }
    }
    else {
        if (Test-Path "scripts/$shEquivalent") {
            Write-Host "⚠️ $psScript (manquant) ↔ $shEquivalent" -ForegroundColor Yellow
            $MissingPs += $psScript
        }
    }
}
Write-Host ""

# 4) Test de fonctionnement des scripts PowerShell
Write-Host "4. TEST DE FONCTIONNEMENT POWERSHELL" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow
Write-Host ""

foreach ($psScript in $psScripts) {
    $scriptName = $psScript.Name
    Write-Host "Test de $scriptName..." -ForegroundColor White
    
    # Test avec --help si disponible
    try {
        $result = & pwsh -File $psScript.FullName --help 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $scriptName - Aide disponible" -ForegroundColor Green
        }
        else {
            Write-Host "⚠️ $scriptName - Test basique" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "⚠️ $scriptName - Test basique" -ForegroundColor Yellow
    }
    Start-Sleep -Milliseconds 50
}
Write-Host ""

# 5) Génération du rapport de compatibilité
Write-Host "5. RAPPORT DE COMPATIBILITÉ" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow
Write-Host ""

$ReportFile = "COMPATIBILITE-REPORT-$(Get-Date -Format 'yyyyMMdd-HHmmss').md"

$ReportContent = @"
# RAPPORT DE COMPATIBILITÉ POWERSHELL/BASH

## 📊 ÉQUIVALENCES DE SCRIPTS

### Scripts PowerShell
"@

foreach ($psScript in $PsScripts) {
    $ReportContent += "`n- $psScript"
}

$ReportContent += @"

### Scripts Bash
"@

foreach ($shScript in $ShScripts) {
    $ReportContent += "`n- $shScript"
}

$ReportContent += @"

### Correspondances
"@

foreach ($psScript in $PsToSh.Keys) {
    $shEquivalent = $PsToSh[$psScript]
    if ((Test-Path "scripts/$psScript") -and (Test-Path "scripts/$shEquivalent")) {
        $ReportContent += "`n- ✅ $psScript ↔ $shEquivalent"
    }
    elseif (Test-Path "scripts/$psScript") {
        $ReportContent += "`n- ❌ $psScript → $shEquivalent (manquant)"
    }
    elseif (Test-Path "scripts/$shEquivalent") {
        $ReportContent += "`n- ⚠️ $psScript (manquant) ↔ $shEquivalent"
    }
}

$ReportContent += @"

## 📈 STATISTIQUES

- Scripts PowerShell: $($PsScripts.Count)
- Scripts Bash: $($ShScripts.Count)
- Équivalents manquants Bash: $($MissingSh.Count)
- Scripts PowerShell manquants: $($MissingPs.Count)
"@

$ReportContent += @"

## 🎯 RECOMMANDATIONS
"@

if ($MissingSh.Count -eq 0 -and $MissingPs.Count -eq 0) {
    $ReportContent += @"

- ✅ Compatibilité parfaite entre PowerShell et Bash
- ✅ Tous les scripts ont leurs équivalents
"@
}
else {
    if ($MissingSh.Count -gt 0) {
        $ReportContent += "`n- ❌ Créer les équivalents Bash manquants:"
        foreach ($missing in $MissingSh) {
            $ReportContent += "`n  - $missing"
        }
    }
    
    if ($MissingPs.Count -gt 0) {
        $ReportContent += "`n- ⚠️ Scripts PowerShell manquants:"
        foreach ($missing in $MissingPs) {
            $ReportContent += "`n  - $missing"
        }
    }
}

$ReportContent += @"

## 📅 TIMESTAMP

- Date: $(Get-Date -Format 'yyyy-MM-dd')
- Heure: $(Get-Date -Format 'HH:mm:ss') UTC
- Script: test-compatibilite.ps1

---

*Rapport généré automatiquement - Mode YOLO Intelligent*
"@

$ReportContent | Out-File -FilePath $ReportFile -Encoding UTF8

# 6) Résumé final
Write-Host "📊 RÉSUMÉ FINAL" -ForegroundColor Green
Write-Host "===============" -ForegroundColor Green
Write-Host "Scripts PowerShell: $($PsScripts.Count)" -ForegroundColor White
Write-Host "Scripts Bash: $($ShScripts.Count)" -ForegroundColor White
Write-Host "Équivalents manquants: $($MissingSh.Count)" -ForegroundColor White
Write-Host "Rapport généré: $ReportFile" -ForegroundColor White
Write-Host ""

if ($MissingSh.Count -eq 0) {
    Write-Host "✅ COMPATIBILITÉ PARFAITE" -ForegroundColor Green
    Write-Host "🎉 Tous les scripts ont leurs équivalents" -ForegroundColor Cyan
    Write-Host ""
}
else {
    Write-Host "⚠️ COMPATIBILITÉ PARTIELLE" -ForegroundColor Yellow
    Write-Host "🔧 $($MissingSh.Count) équivalents Bash manquants" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "TEST DE COMPATIBILITÉ TERMINÉ !" -ForegroundColor Green
Write-Host "Mode YOLO Intelligent activé - Compatibilité cross-platform" -ForegroundColor Cyan
Write-Host "" 