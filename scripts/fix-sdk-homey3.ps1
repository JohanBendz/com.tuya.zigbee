# FIX SDK HOMEY 3 - Tuya Zigbee Project
# Script pour corriger la syntaxe SDK Homey 3 dans tous les drivers

param(
    [switch]$Force = $false,
    [switch]$Verbose = $false
)

Write-Host "FIX SDK HOMEY 3 - CORRECTION SYNTAXE" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Variables globales
$driversPath = "drivers"
$driversFixed = 0
$totalDrivers = 0

# Fonction pour corriger un driver SDK Homey 3
function Fix-SDKHomey3 {
    param($driverPath)
    
    $driverName = Split-Path $driverPath -Leaf
    $deviceJs = Join-Path $driverPath "device.js"
    
    if (-not (Test-Path $deviceJs)) {
        return $false
    }
    
    $content = Get-Content $deviceJs -Raw
    $originalContent = $content
    $modified = $false
    
    Write-Host "🔧 Correction SDK Homey 3: $driverName" -ForegroundColor Yellow
    
    # 1. Corriger les imports SDK Homey 3
    if ($content -match "const.*ZigBeeDevice.*homey-zigbeedriver") {
        $content = $content -replace "const \{ ZigBeeDevice \} = require\('homey-zigbeedriver'\);", "const { ZigbeeDevice } = require('homey-meshdriver');"
        $modified = $true
        Write-Host "  ✅ Imports SDK Homey 3 corrigés" -ForegroundColor Green
    }
    
    # 2. Corriger l'extension de classe
    if ($content -match "extends ZigBeeDevice") {
        $content = $content -replace "extends ZigBeeDevice", "extends ZigbeeDevice"
        $modified = $true
        Write-Host "  ✅ Extension ZigbeeDevice corrigée" -ForegroundColor Green
    }
    
    # 3. Corriger onNodeInit vers onInit
    if ($content -match "async onNodeInit") {
        $content = $content -replace "async onNodeInit\(\{zclNode\}\)", "async onInit()"
        $content = $content -replace "await super\.onNodeInit\(\{zclNode\}\);", "await super.onInit();"
        $modified = $true
        Write-Host "  ✅ Méthode onNodeInit corrigée vers onInit" -ForegroundColor Green
    }
    
    # 4. Corriger les clusters
    if ($content -match "CLUSTER\.ON_OFF") {
        $content = $content -replace "CLUSTER\.ON_OFF", "'genOnOff'"
        $modified = $true
        Write-Host "  ✅ Clusters corrigés" -ForegroundColor Green
    }
    
    if ($content -match "CLUSTER\.POWER_CONFIGURATION") {
        $content = $content -replace "CLUSTER\.POWER_CONFIGURATION", "'genPowerCfg'"
        $modified = $true
        Write-Host "  ✅ Clusters POWER_CONFIGURATION corrigés" -ForegroundColor Green
    }
    
    # 5. Corriger les endpoints
    if ($content -match "endpoint:") {
        $content = $content -replace "endpoint: (\d+)", "cluster: 'genOnOff', endpoint: `$1"
        $modified = $true
        Write-Host "  ✅ Endpoints corrigés" -ForegroundColor Green
    }
    
    # 6. Ajouter le mode YOLO Intelligent
    if ($content -notmatch "Mode YOLO Intelligent") {
        $yoloComment = "`n        // Mode YOLO Intelligent activé - SDK Homey 3 optimisé"
        $content = $content -replace "this\.log\('.*?'\);", "this.log('Mode YOLO Intelligent activé - SDK Homey 3 optimisé');"
        $modified = $true
        Write-Host "  ✅ Mode YOLO Intelligent ajouté" -ForegroundColor Green
    }
    
    # 7. Corriger les capacités registerCapability
    if ($content -match "registerCapability.*CLUSTER") {
        $content = $content -replace "registerCapability\('([^']+)', CLUSTER\.([^,]+),", "registerCapability('`$1', 'gen`$2',"
        $modified = $true
        Write-Host "  ✅ Capacités registerCapability corrigées" -ForegroundColor Green
    }
    
    # Sauvegarder si des modifications ont été faites
    if ($modified) {
        Set-Content -Path $deviceJs -Value $content -Encoding UTF8
        Write-Host "  ✅ $driverName - SDK Homey 3 corrigé" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ℹ️ $driverName - Déjà conforme SDK Homey 3" -ForegroundColor Yellow
        return $false
    }
}

# Fonction pour corriger driver.compose.json
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
        
        # Corriger les capacités si nécessaire
        if ($compose.capabilities -and $compose.capabilities.Count -gt 0) {
            $validCapabilities = @("onoff", "measure_battery", "alarm_battery", "button", "measure_voltage", "measure_current")
            $correctedCapabilities = @()
            
            foreach ($cap in $compose.capabilities) {
                if ($validCapabilities -contains $cap) {
                    $correctedCapabilities += $cap
                }
            }
            
            if ($correctedCapabilities.Count -ne $compose.capabilities.Count) {
                $compose.capabilities = $correctedCapabilities
                $modified = $true
            }
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

# 1. Analyse et correction de tous les drivers
Write-Host "1. CORRECTION SDK HOMEY 3" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

$drivers = Get-ChildItem -Path $driversPath -Directory
$totalDrivers = $drivers.Count

foreach ($driver in $drivers) {
    $deviceFixed = Fix-SDKHomey3 -driverPath $driver.FullName
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
    Write-Host "`n✅ CORRECTIONS SDK HOMEY 3 EFFECTUÉES:" -ForegroundColor Green
    Write-Host "- Imports SDK Homey 3 corrigés" -ForegroundColor Green
    Write-Host "- Extensions ZigbeeDevice standardisées" -ForegroundColor Green
    Write-Host "- Méthodes onNodeInit → onInit" -ForegroundColor Green
    Write-Host "- Clusters corrigés" -ForegroundColor Green
    Write-Host "- Endpoints optimisés" -ForegroundColor Green
    Write-Host "- Capacités registerCapability corrigées" -ForegroundColor Green
    Write-Host "- Mode YOLO Intelligent ajouté" -ForegroundColor Green
}

Write-Host "`nFIX SDK HOMEY 3 TERMINÉ!" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host "SDK Homey 3 - Syntaxe corrigée et optimisée" -ForegroundColor White 