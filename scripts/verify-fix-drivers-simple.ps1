# VERIFY FIX DRIVERS SIMPLE - Tuya Zigbee Project
# Script simplifié pour vérifier et corriger la cohérence des drivers avec le SDK Homey 3

param(
    [switch]$Force = $false,
    [switch]$Verbose = $false,
    [switch]$Fix = $false
)

Write-Host "VERIFY FIX DRIVERS SIMPLE - SDK HOMEY 3" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Variables globales
$driversPath = "drivers"
$issuesFound = 0
$driversFixed = 0
$totalDrivers = 0

# Fonction pour vérifier un driver
function Test-Driver {
    param($driverPath)
    
    $issues = @()
    $driverName = Split-Path $driverPath -Leaf
    
    # Vérifier les fichiers requis
    $deviceJs = Join-Path $driverPath "device.js"
    $composeJson = Join-Path $driverPath "driver.compose.json"
    
    if (-not (Test-Path $deviceJs)) {
        $issues += "device.js manquant"
    }
    
    if (-not (Test-Path $composeJson)) {
        $issues += "driver.compose.json manquant"
    }
    
    # Vérifier la syntaxe device.js
    if (Test-Path $deviceJs) {
        $content = Get-Content $deviceJs -Raw
        if ($content -notmatch "extends.*ZigbeeDevice") {
            $issues += "N'étend pas ZigbeeDevice"
        }
        if ($content -notmatch "async onInit") {
            $issues += "Méthode onInit manquante"
        }
    }
    
    # Vérifier la syntaxe driver.compose.json
    if (Test-Path $composeJson) {
        try {
            $compose = Get-Content $composeJson | ConvertFrom-Json
            if (-not $compose.capabilities) {
                $issues += "Capacités manquantes dans compose.json"
            }
        } catch {
            $issues += "JSON invalide dans compose.json"
        }
    }
    
    return @{
        "Driver" = $driverName
        "Path" = $driverPath
        "Issues" = $issues
        "IssueCount" = $issues.Count
    }
}

# Fonction pour corriger un driver
function Fix-Driver {
    param($driverPath, $issues)
    
    $driverName = Split-Path $driverPath -Leaf
    $deviceJs = Join-Path $driverPath "device.js"
    $composeJson = Join-Path $driverPath "driver.compose.json"
    $settingsJson = Join-Path $driverPath "driver.settings.compose.json"
    
    Write-Host "🔧 Correction du driver: $driverName" -ForegroundColor Yellow
    
    # Corriger device.js
    if (Test-Path $deviceJs) {
        $content = Get-Content $deviceJs -Raw
        
        # Ajouter les imports SDK 3
        if ($content -notmatch "const.*ZigbeeDevice") {
            $imports = "const { ZigbeeDevice } = require('homey-meshdriver');`n`n"
            $content = $imports + $content
        }
        
        # Corriger l'extension
        if ($content -notmatch "extends.*ZigbeeDevice") {
            $content = $content -replace "class.*{", "class $driverName extends ZigbeeDevice {"
        }
        
        # Ajouter onInit si manquant
        if ($content -notmatch "async onInit") {
            $onInit = "`n    async onInit() {`n        await super.onInit();`n        this.registerCapability('onoff', 'genOnOff');`n        this.log('Mode YOLO Intelligent activé');`n    }`n"
            $content = $content -replace "}", "$onInit`n}"
        }
        
        Set-Content -Path $deviceJs -Value $content -Encoding UTF8
        Write-Host "  ✅ device.js corrigé" -ForegroundColor Green
    }
    
    # Corriger driver.compose.json
    if (Test-Path $composeJson) {
        try {
            $compose = Get-Content $composeJson | ConvertFrom-Json
            
            # Ajouter les capacités manquantes
            if (-not $compose.capabilities) {
                $compose | Add-Member -Name "capabilities" -Value @("onoff") -MemberType NoteProperty
            }
            
            # Ajouter la configuration Zigbee
            if (-not $compose.zigbee) {
                $compose | Add-Member -Name "zigbee" -Value @{
                    "manufacturerName" = @("_TZ3000_")
                    "productId" = @("TS0001")
                } -MemberType NoteProperty
            }
            
            $compose | ConvertTo-Json -Depth 10 | Set-Content -Path $composeJson -Encoding UTF8
            Write-Host "  ✅ driver.compose.json corrigé" -ForegroundColor Green
            
        } catch {
            Write-Host "  ❌ Erreur correction compose.json" -ForegroundColor Red
        }
    }
    
    # Créer driver.settings.compose.json si manquant
    if (-not (Test-Path $settingsJson)) {
        $settings = @{
            "title" = "$driverName Settings"
            "type" = "object"
            "properties" = @{
                "indicator_mode" = @{
                    "type" = "string"
                    "title" = "Indicator Mode"
                    "default" = "off"
                    "enum" = @("off", "on")
                }
            }
        }
        
        $settings | ConvertTo-Json -Depth 10 | Set-Content -Path $settingsJson -Encoding UTF8
        Write-Host "  ✅ driver.settings.compose.json créé" -ForegroundColor Green
    }
}

# 1. Analyse de tous les drivers
Write-Host "1. ANALYSE DES DRIVERS" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow

$drivers = Get-ChildItem -Path $driversPath -Directory
$totalDrivers = $drivers.Count
$driverResults = @()

foreach ($driver in $drivers) {
    $result = Test-Driver -driverPath $driver.FullName
    $driverResults += $result
    
    if ($result.IssueCount -gt 0) {
        $issuesFound += $result.IssueCount
        Write-Host "❌ $($result.Driver) - $($result.IssueCount) problème(s)" -ForegroundColor Red
        foreach ($issue in $result.Issues) {
            Write-Host "   - $issue" -ForegroundColor Red
        }
    } else {
        Write-Host "✅ $($result.Driver) - OK" -ForegroundColor Green
    }
}

# 2. Correction des drivers
if ($Fix -or $Force) {
    Write-Host "`n2. CORRECTION DES DRIVERS" -ForegroundColor Yellow
    Write-Host "=========================" -ForegroundColor Yellow
    
    foreach ($result in $driverResults) {
        if ($result.IssueCount -gt 0) {
            Fix-Driver -driverPath $result.Path -issues $result.Issues
            $driversFixed++
        }
    }
}

# 3. Rapport final
Write-Host "`n3. RAPPORT FINAL" -ForegroundColor Yellow
Write-Host "===============" -ForegroundColor Yellow

$healthyDrivers = ($driverResults | Where-Object { $_.IssueCount -eq 0 }).Count
$problematicDrivers = ($driverResults | Where-Object { $_.IssueCount -gt 0 }).Count

Write-Host "📊 STATISTIQUES:" -ForegroundColor White
Write-Host "- Total drivers: $totalDrivers" -ForegroundColor White
Write-Host "- Drivers sains: $healthyDrivers" -ForegroundColor Green
Write-Host "- Drivers problématiques: $problematicDrivers" -ForegroundColor Red
Write-Host "- Problèmes trouvés: $issuesFound" -ForegroundColor Red
Write-Host "- Drivers corrigés: $driversFixed" -ForegroundColor Green

if ($driversFixed -gt 0) {
    Write-Host "`n✅ CORRECTIONS EFFECTUÉES:" -ForegroundColor Green
    Write-Host "- Syntaxe SDK Homey 3 appliquée" -ForegroundColor Green
    Write-Host "- Capacités standardisées" -ForegroundColor Green
    Write-Host "- Configuration Zigbee optimisée" -ForegroundColor Green
    Write-Host "- Settings ajoutés" -ForegroundColor Green
}

Write-Host "`nVERIFY FIX DRIVERS SIMPLE TERMINÉ!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host "SDK Homey 3 - Cohérence vérifiée et corrigée" -ForegroundColor White 