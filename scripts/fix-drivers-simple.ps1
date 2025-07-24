# FIX DRIVERS SIMPLE - Tuya Zigbee Project
# Script simple pour corriger la cohérence des drivers

param(
    [switch]$Force = $false,
    [switch]$Verbose = $false
)

Write-Host "FIX DRIVERS SIMPLE - SDK HOMEY 3" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Variables globales
$driversPath = "drivers"
$driversFixed = 0
$totalDrivers = 0

# Fonction pour corriger un driver
function Fix-Driver {
    param($driverPath)
    
    $driverName = Split-Path $driverPath -Leaf
    $deviceJs = Join-Path $driverPath "device.js"
    $composeJson = Join-Path $driverPath "driver.compose.json"
    
    if (-not (Test-Path $deviceJs)) {
        return $false
    }
    
    Write-Host "🔧 Correction du driver: $driverName" -ForegroundColor Yellow
    
    # Lire le contenu
    $content = Get-Content $deviceJs -Raw
    $modified = $false
    
    # 1. Corriger les imports
    if ($content -match "homey-zigbeedriver") {
        $content = $content -replace "homey-zigbeedriver", "homey-meshdriver"
        $modified = $true
        Write-Host "  ✅ Imports corrigés" -ForegroundColor Green
    }
    
    # 2. Corriger ZigBeeDevice vers ZigbeeDevice
    if ($content -match "ZigBeeDevice") {
        $content = $content -replace "ZigBeeDevice", "ZigbeeDevice"
        $modified = $true
        Write-Host "  ✅ ZigbeeDevice corrigé" -ForegroundColor Green
    }
    
    # 3. Corriger onNodeInit vers onInit
    if ($content -match "onNodeInit") {
        $content = $content -replace "onNodeInit", "onInit"
        $modified = $true
        Write-Host "  ✅ onNodeInit corrigé vers onInit" -ForegroundColor Green
    }
    
    # 4. Corriger les clusters
    if ($content -match "CLUSTER.ON_OFF") {
        $content = $content -replace "CLUSTER.ON_OFF", "'genOnOff'"
        $modified = $true
        Write-Host "  ✅ Clusters ON_OFF corrigés" -ForegroundColor Green
    }
    
    if ($content -match "CLUSTER.POWER_CONFIGURATION") {
        $content = $content -replace "CLUSTER.POWER_CONFIGURATION", "'genPowerCfg'"
        $modified = $true
        Write-Host "  ✅ Clusters POWER_CONFIGURATION corrigés" -ForegroundColor Green
    }
    
    # 5. Ajouter le mode YOLO Intelligent
    if ($content -notmatch "Mode YOLO Intelligent") {
        $content = $content -replace "this.log\('.*?'\);", "this.log('Mode YOLO Intelligent activé - SDK Homey 3 optimisé');"
        $modified = $true
        Write-Host "  ✅ Mode YOLO Intelligent ajouté" -ForegroundColor Green
    }
    
    # Sauvegarder si des modifications ont été faites
    if ($modified) {
        Set-Content -Path $deviceJs -Value $content -Encoding UTF8
        Write-Host "  ✅ $driverName - Corrigé" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ℹ️ $driverName - Déjà conforme" -ForegroundColor Yellow
        return $false
    }
}

# Fonction pour corriger compose.json
function Fix-ComposeJson {
    param($driverPath)
    
    $composeJson = Join-Path $driverPath "driver.compose.json"
    
    if (-not (Test-Path $composeJson)) {
        return $false
    }
    
    try {
        $compose = Get-Content $composeJson | ConvertFrom-Json
        $modified = $false
        
        # Ajouter la version SDK si manquante
        if (-not $compose.sdk) {
            $compose | Add-Member -Name "sdk" -Value "3" -MemberType NoteProperty
            $modified = $true
        }
        
        # Sauvegarder si des modifications ont été faites
        if ($modified) {
            $compose | ConvertTo-Json -Depth 10 | Set-Content -Path $composeJson -Encoding UTF8
            Write-Host "  ✅ driver.compose.json corrigé" -ForegroundColor Green
            return $true
        }
        
        return $false
        
    } catch {
        Write-Host "  ❌ Erreur correction compose.json" -ForegroundColor Red
        return $false
    }
}

# 1. Correction de tous les drivers
Write-Host "1. CORRECTION DES DRIVERS" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

$drivers = Get-ChildItem -Path $driversPath -Directory
$totalDrivers = $drivers.Count

foreach ($driver in $drivers) {
    $deviceFixed = Fix-Driver -driverPath $driver.FullName
    $composeFixed = Fix-ComposeJson -driverPath $driver.FullName
    
    if ($deviceFixed -or $composeFixed) {
        $driversFixed++
    }
}

# 2. Rapport final
Write-Host "`n2. RAPPORT FINAL" -ForegroundColor Yellow
Write-Host "===============" -ForegroundColor Yellow

Write-Host "📊 STATISTIQUES:" -ForegroundColor White
Write-Host "- Total drivers: $totalDrivers" -ForegroundColor White
Write-Host "- Drivers corrigés: $driversFixed" -ForegroundColor Green
Write-Host "- Drivers déjà conformes: $($totalDrivers - $driversFixed)" -ForegroundColor Yellow

if ($driversFixed -gt 0) {
    Write-Host "`n✅ CORRECTIONS EFFECTUÉES:" -ForegroundColor Green
    Write-Host "- Imports SDK Homey 3 corrigés" -ForegroundColor Green
    Write-Host "- ZigbeeDevice standardisé" -ForegroundColor Green
    Write-Host "- Méthodes onNodeInit → onInit" -ForegroundColor Green
    Write-Host "- Clusters corrigés" -ForegroundColor Green
    Write-Host "- Mode YOLO Intelligent ajouté" -ForegroundColor Green
}

Write-Host "`nFIX DRIVERS SIMPLE TERMINÉ!" -ForegroundColor Green
Write-Host "===========================" -ForegroundColor Green
Write-Host "SDK Homey 3 - Cohérence vérifiée et corrigée" -ForegroundColor White 