# SIMPLE RECOVER DRIVERS - Tuya Zigbee Project
# Script simple pour recuperer tous les drivers

Write-Host "RECUPERATION SIMPLE DES DRIVERS" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# 1) Analyser les branches
Write-Host "`n1. ANALYSE DES BRANCHES" -ForegroundColor Yellow

$branches = @("master", "beta", "SDK3", "main")
$branchData = @{}

foreach ($branch in $branches) {
    try {
        git checkout $branch -q 2>$null
        if (Test-Path "drivers") {
            $driverCount = (Get-ChildItem -Path "drivers" -Directory -ErrorAction SilentlyContinue | Measure-Object).Count
            Write-Host "Branche $branch : $driverCount drivers" -ForegroundColor White
            $branchData[$branch] = @{
                "Available" = $true
                "DriverCount" = $driverCount
            }
        } else {
            Write-Host "Branche $branch : 0 drivers" -ForegroundColor Yellow
            $branchData[$branch] = @{
                "Available" = $true
                "DriverCount" = 0
            }
        }
    } catch {
        Write-Host "Branche $branch : Non disponible" -ForegroundColor Red
        $branchData[$branch] = @{
            "Available" = $false
            "DriverCount" = 0
        }
    }
}

# 2) Recuperer les drivers de la branche beta (qui a le plus)
Write-Host "`n2. RECUPERATION DES DRIVERS DE BETA" -ForegroundColor Yellow

if ($branchData["beta"].Available -and $branchData["beta"].DriverCount -gt 0) {
    try {
        git checkout beta -q
        Write-Host "Recuperation depuis la branche beta..." -ForegroundColor Green
        
        $drivers = Get-ChildItem -Path "drivers" -Directory -ErrorAction SilentlyContinue
        Write-Host "Nombre de drivers trouves: $($drivers.Count)" -ForegroundColor White
        
        # Creer un backup
        $backupPath = Join-Path $env:TEMP "tuya_drivers_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
        
        Copy-Item -Path "drivers\*" -Destination $backupPath -Recurse -Force -ErrorAction SilentlyContinue
        
        $backupSize = (Get-ChildItem -Path $backupPath -Recurse -File | Measure-Object -Property Length -Sum).Sum
        $backupCount = (Get-ChildItem -Path $backupPath -Directory | Measure-Object).Count
        
        Write-Host "Backup cree: $backupPath" -ForegroundColor Green
        Write-Host "Taille backup: $([math]::Round($backupSize / 1MB, 2)) MB" -ForegroundColor White
        Write-Host "Nombre de drivers backup: $backupCount" -ForegroundColor White
        
        # Copier vers master
        git checkout master -q
        if (-not (Test-Path "drivers")) {
            New-Item -ItemType Directory -Path "drivers" -Force | Out-Null
        }
        
        Copy-Item -Path "$backupPath\*" -Destination "drivers" -Recurse -Force -ErrorAction SilentlyContinue
        
        Write-Host "Drivers copies vers master avec succes!" -ForegroundColor Green
        
    } catch {
        Write-Host "ERREUR lors de la recuperation: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "Aucun driver disponible dans la branche beta" -ForegroundColor Red
}

# 3) Validation finale
Write-Host "`n3. VALIDATION FINALE" -ForegroundColor Yellow

$finalDrivers = Get-ChildItem -Path "drivers" -Directory -ErrorAction SilentlyContinue
$validDrivers = 0
$invalidDrivers = 0

foreach ($driver in $finalDrivers) {
    $driverPath = $driver.FullName
    $hasDeviceJs = Test-Path (Join-Path $driverPath "device.js")
    $hasCompose = Test-Path (Join-Path $driverPath "driver.compose.json")
    
    if ($hasDeviceJs -and $hasCompose) {
        $validDrivers++
    } else {
        $invalidDrivers++
        Write-Host "Driver invalide: $($driver.Name)" -ForegroundColor Red
    }
}

Write-Host "`nRESULTATS FINAUX:" -ForegroundColor Green
Write-Host "Drivers valides: $validDrivers" -ForegroundColor Green
Write-Host "Drivers invalides: $invalidDrivers" -ForegroundColor Red
Write-Host "Total drivers: $($finalDrivers.Count)" -ForegroundColor White

Write-Host "`nRECUPERATION TERMINEE!" -ForegroundColor Green
Write-Host "Mode YOLO Intelligent active" -ForegroundColor Cyan 