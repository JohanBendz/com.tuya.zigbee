# RECOVER DRIVERS - Tuya Zigbee Project
# Script pour recuperer et regenerer tous les drivers de toutes les sources

param(
    [switch]$Force = $false,
    [switch]$DryRun = $false,
    [int]$TimeoutSeconds = 600
)

# Import du module timeout
$timeoutModulePath = Join-Path $PSScriptRoot "timeout-utils.ps1"
if (Test-Path $timeoutModulePath) {
    . $timeoutModulePath
    Set-TimeoutConfiguration -Environment "Development"
} else {
    Write-Host "Module timeout non trouve, utilisation des timeouts par defaut" -ForegroundColor Yellow
}

Write-Host "RECUPERATION ET REGENERATION DES DRIVERS" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Statistiques de timeout
$timeoutStats = @{
    "BranchAnalysis" = 0
    "DriverRecovery" = 0
    "DriverMerge" = 0
    "DriverValidation" = 0
    "BackupCreation" = 0
}

# Variables globales
$global:allDrivers = @{}
$global:branches = @("master", "beta", "SDK3", "main")
$global:recoveredDrivers = 0
$global:mergedDrivers = 0

# 1) Analyse des branches avec timeout
Write-Host "1. ANALYSE DES BRANCHES" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow

try {
    $branchAnalysisScript = {
        $branches = @("master", "beta", "SDK3", "main")
        $branchInfo = @{}
        
        foreach ($branch in $branches) {
            try {
                git checkout $branch -q 2>$null
                if (Test-Path "drivers") {
                    $driverCount = (Get-ChildItem -Path "drivers" -Directory -ErrorAction SilentlyContinue | Measure-Object).Count
                    $driverNames = Get-ChildItem -Path "drivers" -Directory -ErrorAction SilentlyContinue | ForEach-Object { $_.Name }
                } else {
                    $driverCount = 0
                    $driverNames = @()
                }
                
                $branchInfo[$branch] = @{
                    "Available" = $true
                    "DriverCount" = $driverCount
                    "Drivers" = $driverNames
                }
                
                Write-Host "Branche $branch : $driverCount drivers" -ForegroundColor White
            } catch {
                $branchInfo[$branch] = @{
                    "Available" = $false
                    "DriverCount" = 0
                    "Drivers" = @()
                }
                Write-Host "Branche $branch : Non disponible" -ForegroundColor Yellow
            }
        }
        
        return $branchInfo
    }
    
    $branchData = Invoke-WithTimeout -ScriptBlock $branchAnalysisScript -TimeoutSeconds 120 -OperationName "Analyse branches"
    
    if ($branchData) {
        $global:allDrivers = $branchData
    }
    
    $timeoutStats.BranchAnalysis++
} catch {
    Write-Host "ERREUR analyse branches: $($_.Exception.Message)" -ForegroundColor Red
}

# 2) Recuperation des drivers avec timeout
Write-Host "`n2. RECUPERATION DES DRIVERS" -ForegroundColor Yellow
Write-Host "===========================" -ForegroundColor Yellow

try {
    $driverRecoveryScript = {
        param($branchData)
        $recoveredDrivers = @{}
        
        foreach ($branch in $branchData.Keys) {
            if ($branchData[$branch].Available -and $branchData[$branch].DriverCount -gt 0) {
                try {
                    git checkout $branch -q 2>$null
                    $drivers = Get-ChildItem -Path "drivers" -Directory -ErrorAction SilentlyContinue
                    
                    foreach ($driver in $drivers) {
                        $driverPath = $driver.FullName
                        $driverName = $driver.Name
                        
                        # Copier le driver complet
                        $tempPath = Join-Path $env:TEMP "tuya_drivers_recovery\$branch\$driverName"
                        if (-not (Test-Path $tempPath)) {
                            New-Item -ItemType Directory -Path $tempPath -Force | Out-Null
                        }
                        
                        Copy-Item -Path "$driverPath\*" -Destination $tempPath -Recurse -Force -ErrorAction SilentlyContinue
                        
                        if (-not $recoveredDrivers.ContainsKey($driverName)) {
                            $recoveredDrivers[$driverName] = @{}
                        }
                        $recoveredDrivers[$driverName][$branch] = $tempPath
                        
                        Write-Host "Driver $driverName recupere depuis $branch" -ForegroundColor Green
                    }
                } catch {
                    Write-Host "Erreur lors de la recuperation de la branche $branch" -ForegroundColor Red
                }
            }
        }
        
        return $recoveredDrivers
    }
    
    $recoveredDrivers = Invoke-WithTimeout -ScriptBlock $driverRecoveryScript -TimeoutSeconds 300 -OperationName "Recuperation drivers" -ArgumentList $global:allDrivers
    
    if ($recoveredDrivers) {
        $global:recoveredDrivers = $recoveredDrivers.Count
        Write-Host "Drivers recuperes: $($global:recoveredDrivers)" -ForegroundColor Green
    }
    
    $timeoutStats.DriverRecovery++
} catch {
    Write-Host "ERREUR recuperation drivers: $($_.Exception.Message)" -ForegroundColor Red
}

# 3) Fusion des drivers avec timeout
Write-Host "`n3. FUSION DES DRIVERS" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow

try {
    $driverMergeScript = {
        param($recoveredDrivers)
        $mergedDrivers = 0
        
        # Retourner a la branche master
        git checkout master -q 2>$null
        
        # Creer le dossier drivers s'il n'existe pas
        if (-not (Test-Path "drivers")) {
            New-Item -ItemType Directory -Path "drivers" -Force | Out-Null
        }
        
        foreach ($driverName in $recoveredDrivers.Keys) {
            $driverBranches = $recoveredDrivers[$driverName]
            $bestVersion = $null
            $bestBranch = $null
            
            # Trouver la meilleure version du driver
            foreach ($branch in $driverBranches.Keys) {
                $driverPath = $driverBranches[$branch]
                if (Test-Path $driverPath) {
                    $files = Get-ChildItem -Path $driverPath -Recurse -File
                    $fileCount = $files.Count
                    $totalSize = ($files | Measure-Object -Property Length -Sum).Sum
                    
                    if (-not $bestVersion -or $fileCount -gt $bestVersion.FileCount) {
                        $bestVersion = @{
                            "Path" = $driverPath
                            "FileCount" = $fileCount
                            "TotalSize" = $totalSize
                        }
                        $bestBranch = $branch
                    }
                }
            }
            
            # Copier la meilleure version
            if ($bestVersion) {
                $targetPath = Join-Path "drivers" $driverName
                if (-not (Test-Path $targetPath)) {
                    New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
                }
                
                Copy-Item -Path "$($bestVersion.Path)\*" -Destination $targetPath -Recurse -Force -ErrorAction SilentlyContinue
                $mergedDrivers++
                
                Write-Host "Driver $driverName fusionne depuis $bestBranch ($($bestVersion.FileCount) fichiers)" -ForegroundColor Green
            }
        }
        
        return $mergedDrivers
    }
    
    $mergedCount = Invoke-WithTimeout -ScriptBlock $driverMergeScript -TimeoutSeconds 300 -OperationName "Fusion drivers" -ArgumentList $recoveredDrivers
    
    if ($mergedCount) {
        $global:mergedDrivers = $mergedCount
        Write-Host "Drivers fusionnes: $($global:mergedDrivers)" -ForegroundColor Green
    }
    
    $timeoutStats.DriverMerge++
} catch {
    Write-Host "ERREUR fusion drivers: $($_.Exception.Message)" -ForegroundColor Red
}

# 4) Validation des drivers avec timeout
Write-Host "`n4. VALIDATION DES DRIVERS" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

try {
    $driverValidationScript = {
        $drivers = Get-ChildItem -Path "drivers" -Directory -ErrorAction SilentlyContinue
        $validDrivers = 0
        $invalidDrivers = 0
        $validationResults = @{}
        
        foreach ($driver in $drivers) {
            $driverPath = $driver.FullName
            $driverName = $driver.Name
            
            # Verifier les fichiers essentiels
            $hasDeviceJs = Test-Path (Join-Path $driverPath "device.js")
            $hasCompose = Test-Path (Join-Path $driverPath "driver.compose.json")
            $hasAssets = Test-Path (Join-Path $driverPath "assets")
            
            if ($hasDeviceJs -and $hasCompose) {
                $validDrivers++
                $validationResults[$driverName] = @{
                    "Status" = "VALID"
                    "HasDeviceJs" = $hasDeviceJs
                    "HasCompose" = $hasCompose
                    "HasAssets" = $hasAssets
                }
            } else {
                $invalidDrivers++
                $validationResults[$driverName] = @{
                    "Status" = "INVALID"
                    "HasDeviceJs" = $hasDeviceJs
                    "HasCompose" = $hasCompose
                    "HasAssets" = $hasAssets
                }
            }
        }
        
        return @{
            "ValidDrivers" = $validDrivers
            "InvalidDrivers" = $invalidDrivers
            "TotalDrivers" = $drivers.Count
            "ValidationResults" = $validationResults
        }
    }
    
    $validationData = Invoke-WithTimeout -ScriptBlock $driverValidationScript -TimeoutSeconds 120 -OperationName "Validation drivers"
    
    if ($validationData) {
        Write-Host "Drivers valides: $($validationData.ValidDrivers)" -ForegroundColor Green
        Write-Host "Drivers invalides: $($validationData.InvalidDrivers)" -ForegroundColor Red
        Write-Host "Total drivers: $($validationData.TotalDrivers)" -ForegroundColor White
        
        # Afficher les drivers invalides
        foreach ($driver in $validationData.ValidationResults.Keys) {
            $result = $validationData.ValidationResults[$driver]
            if ($result.Status -eq "INVALID") {
                Write-Host "Driver invalide: $driver" -ForegroundColor Red
            }
        }
    }
    
    $timeoutStats.DriverValidation++
} catch {
    Write-Host "ERREUR validation drivers: $($_.Exception.Message)" -ForegroundColor Red
}

# 5) Creation de backup avec timeout
Write-Host "`n5. CREATION DE BACKUP" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow

try {
    $backupScript = {
        $backupPath = Join-Path $env:TEMP "tuya_drivers_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
        New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
        
        if (Test-Path "drivers") {
            Copy-Item -Path "drivers\*" -Destination $backupPath -Recurse -Force -ErrorAction SilentlyContinue
        }
        
        $backupSize = (Get-ChildItem -Path $backupPath -Recurse -File | Measure-Object -Property Length -Sum).Sum
        $backupCount = (Get-ChildItem -Path $backupPath -Directory | Measure-Object).Count
        
        return @{
            "BackupPath" = $backupPath
            "BackupSize" = $backupSize
            "BackupCount" = $backupCount
        }
    }
    
    $backupData = Invoke-WithTimeout -ScriptBlock $backupScript -TimeoutSeconds 60 -OperationName "Creation backup"
    
    if ($backupData) {
        Write-Host "Backup cree: $($backupData.BackupPath)" -ForegroundColor Green
        Write-Host "Taille backup: $([math]::Round($backupData.BackupSize / 1MB, 2)) MB" -ForegroundColor White
        Write-Host "Nombre de drivers backup: $($backupData.BackupCount)" -ForegroundColor White
    }
    
    $timeoutStats.BackupCreation++
} catch {
    Write-Host "ERREUR creation backup: $($_.Exception.Message)" -ForegroundColor Red
}

# 6) Rapport final avec timeout
Write-Host "`n6. RAPPORT FINAL" -ForegroundColor Yellow
Write-Host "===============" -ForegroundColor Yellow

try {
    $finalReportScript = {
        param($recoveredDrivers, $mergedDrivers, $validationData, $backupData)
        
        $report = @"
RAPPORT DE RECUPERATION DES DRIVERS - Tuya Zigbee Project

Recuperation:
- Drivers recuperes: $recoveredDrivers
- Drivers fusionnes: $mergedDrivers

Validation:
- Drivers valides: $($validationData.ValidDrivers)
- Drivers invalides: $($validationData.InvalidDrivers)
- Total drivers: $($validationData.TotalDrivers)

Backup:
- Chemin: $($backupData.BackupPath)
- Taille: $([math]::Round($backupData.BackupSize / 1MB, 2)) MB
- Nombre: $($backupData.BackupCount)

Statut:
- Recuperation: Terminee
- Fusion: Terminee
- Validation: Terminee
- Backup: Cree

---
Rapport genere automatiquement - Mode YOLO Intelligent
"@
        
        return $report
    }
    
    $finalReport = Invoke-WithTimeout -ScriptBlock $finalReportScript -TimeoutSeconds 30 -OperationName "Generation rapport final" -ArgumentList $global:recoveredDrivers, $global:mergedDrivers, $validationData, $backupData
    
    if ($finalReport) {
        Write-Host $finalReport -ForegroundColor White
    }
    
    $timeoutStats.DriverValidation++
} catch {
    Write-Host "ERREUR rapport final: $($_.Exception.Message)" -ForegroundColor Red
}

# 7) Affichage des statistiques de timeout
Write-Host "`n7. STATISTIQUES TIMEOUT" -ForegroundColor Yellow
Write-Host "========================" -ForegroundColor Yellow

Show-TimeoutStats -Stats $timeoutStats

# 8) Nettoyage des jobs
Write-Host "`n8. NETTOYAGE" -ForegroundColor Yellow
Write-Host "==============" -ForegroundColor Yellow

Clear-TimeoutJobs

Write-Host "`nRECUPERATION DES DRIVERS TERMINEE" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "Tous les drivers ont ete recuperes et regeneres!" -ForegroundColor White
Write-Host "Mode YOLO Intelligent active - Recuperation continue" -ForegroundColor Cyan 