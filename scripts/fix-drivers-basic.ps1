# FIX DRIVERS BASIC - Tuya Zigbee Project
# Script basique pour corriger la cohérence des drivers

Write-Host "FIX DRIVERS BASIC - SDK HOMEY 3" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

# Variables globales
$driversPath = "drivers"
$driversFixed = 0
$totalDrivers = 0

# Fonction pour corriger un driver
function Fix-Driver {
    param($driverPath)
    
    $driverName = Split-Path $driverPath -Leaf
    $deviceJs = Join-Path $driverPath "device.js"
    
    if (-not (Test-Path $deviceJs)) {
        return $false
    }
    
    Write-Host "Correction du driver: $driverName" -ForegroundColor Yellow
    
    # Lire le contenu
    $content = Get-Content $deviceJs -Raw
    $modified = $false
    
    # 1. Corriger les imports
    if ($content -match "homey-zigbeedriver") {
        $content = $content -replace "homey-zigbeedriver", "homey-meshdriver"
        $modified = $true
        Write-Host "  Imports corriges" -ForegroundColor Green
    }
    
    # 2. Corriger ZigBeeDevice vers ZigbeeDevice
    if ($content -match "ZigBeeDevice") {
        $content = $content -replace "ZigBeeDevice", "ZigbeeDevice"
        $modified = $true
        Write-Host "  ZigbeeDevice corrige" -ForegroundColor Green
    }
    
    # 3. Corriger onNodeInit vers onInit
    if ($content -match "onNodeInit") {
        $content = $content -replace "onNodeInit", "onInit"
        $modified = $true
        Write-Host "  onNodeInit corrige vers onInit" -ForegroundColor Green
    }
    
    # 4. Corriger les clusters
    if ($content -match "CLUSTER.ON_OFF") {
        $content = $content -replace "CLUSTER.ON_OFF", "'genOnOff'"
        $modified = $true
        Write-Host "  Clusters ON_OFF corriges" -ForegroundColor Green
    }
    
    if ($content -match "CLUSTER.POWER_CONFIGURATION") {
        $content = $content -replace "CLUSTER.POWER_CONFIGURATION", "'genPowerCfg'"
        $modified = $true
        Write-Host "  Clusters POWER_CONFIGURATION corriges" -ForegroundColor Green
    }
    
    # Sauvegarder si des modifications ont été faites
    if ($modified) {
        Set-Content -Path $deviceJs -Value $content -Encoding UTF8
        Write-Host "  $driverName - Corrige" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  $driverName - Deja conforme" -ForegroundColor Yellow
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
    
    if ($deviceFixed) {
        $driversFixed++
    }
}

# 2. Rapport final
Write-Host "`n2. RAPPORT FINAL" -ForegroundColor Yellow
Write-Host "===============" -ForegroundColor Yellow

Write-Host "STATISTIQUES:" -ForegroundColor White
Write-Host "- Total drivers: $totalDrivers" -ForegroundColor White
Write-Host "- Drivers corriges: $driversFixed" -ForegroundColor Green
Write-Host "- Drivers deja conformes: $($totalDrivers - $driversFixed)" -ForegroundColor Yellow

if ($driversFixed -gt 0) {
    Write-Host "`nCORRECTIONS EFFECTUEES:" -ForegroundColor Green
    Write-Host "- Imports SDK Homey 3 corriges" -ForegroundColor Green
    Write-Host "- ZigbeeDevice standardise" -ForegroundColor Green
    Write-Host "- Methodes onNodeInit vers onInit" -ForegroundColor Green
    Write-Host "- Clusters corriges" -ForegroundColor Green
}

Write-Host "`nFIX DRIVERS BASIC TERMINE!" -ForegroundColor Green
Write-Host "===========================" -ForegroundColor Green
Write-Host "SDK Homey 3 - Coherence verifiee et corrigee" -ForegroundColor White 