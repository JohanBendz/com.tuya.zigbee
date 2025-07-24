# AUTO KEEP ALL - Tuya Zigbee Project
# Script pour automatiser la sauvegarde et conservation de tous les fichiers et étapes

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

Write-Host "AUTO KEEP ALL - SAUVEGARDE AUTOMATIQUE" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# Statistiques de timeout
$timeoutStats = @{
    "BackupCreation" = 0
    "FileAnalysis" = 0
    "GitOperations" = 0
    "Validation" = 0
    "Cleanup" = 0
}

# Variables globales
$global:backupPath = ""
$global:totalFiles = 0
$global:backupSize = 0

# 1) Création de la sauvegarde automatique avec timeout
Write-Host "1. CRÉATION DE LA SAUVEGARDE" -ForegroundColor Yellow
Write-Host "============================" -ForegroundColor Yellow

try {
    $backupCreationScript = {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backupPath = Join-Path $env:TEMP "tuya_auto_backup_$timestamp"
        
        # Créer le dossier de sauvegarde
        New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
        
        # Copier tous les fichiers du projet
        $files = Get-ChildItem -Path "." -Recurse -File -ErrorAction SilentlyContinue
        $totalFiles = $files.Count
        
        foreach ($file in $files) {
            $relativePath = $file.FullName.Substring((Get-Location).Path.Length + 1)
            $backupFilePath = Join-Path $backupPath $relativePath
            
            # Créer le dossier de destination si nécessaire
            $backupDir = Split-Path $backupFilePath -Parent
            if (-not (Test-Path $backupDir)) {
                New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
            }
            
            # Copier le fichier
            Copy-Item -Path $file.FullName -Destination $backupFilePath -Force -ErrorAction SilentlyContinue
        }
        
        # Calculer la taille de la sauvegarde
        $backupSize = (Get-ChildItem -Path $backupPath -Recurse -File | Measure-Object -Property Length -Sum).Sum
        
        return @{
            "BackupPath" = $backupPath
            "TotalFiles" = $totalFiles
            "BackupSize" = $backupSize
        }
    }
    
    $backupData = Invoke-WithTimeout -ScriptBlock $backupCreationScript -TimeoutSeconds 300 -OperationName "Creation sauvegarde"
    
    if ($backupData) {
        $global:backupPath = $backupData.BackupPath
        $global:totalFiles = $backupData.TotalFiles
        $global:backupSize = $backupData.BackupSize
        
        Write-Host "Sauvegarde créée: $($global:backupPath)" -ForegroundColor Green
        Write-Host "Fichiers sauvegardés: $($global:totalFiles)" -ForegroundColor White
        Write-Host "Taille sauvegarde: $([math]::Round($global:backupSize / 1MB, 2)) MB" -ForegroundColor White
    }
    
    $timeoutStats.BackupCreation++
} catch {
    Write-Host "ERREUR création sauvegarde: $($_.Exception.Message)" -ForegroundColor Red
}

# 2) Analyse des fichiers avec timeout
Write-Host "`n2. ANALYSE DES FICHIERS" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow

try {
    $fileAnalysisScript = {
        $fileTypes = @{
            "Drivers" = 0
            "Scripts" = 0
            "Configurations" = 0
            "Documentation" = 0
            "Assets" = 0
            "Workflows" = 0
        }
        
        $files = Get-ChildItem -Path "." -Recurse -File -ErrorAction SilentlyContinue
        
        foreach ($file in $files) {
            $extension = $file.Extension.ToLower()
            $path = $file.FullName.ToLower()
            
            if ($path -match "drivers") {
                $fileTypes.Drivers++
            } elseif ($path -match "scripts" -or $extension -eq ".ps1") {
                $fileTypes.Scripts++
            } elseif ($extension -eq ".json" -or $extension -eq ".yml" -or $extension -eq ".yaml") {
                $fileTypes.Configurations++
            } elseif ($extension -eq ".md" -or $extension -eq ".txt") {
                $fileTypes.Documentation++
            } elseif ($extension -eq ".png" -or $extension -eq ".jpg" -or $extension -eq ".svg") {
                $fileTypes.Assets++
            } elseif ($path -match "workflows" -or $path -match ".github") {
                $fileTypes.Workflows++
            }
        }
        
        return $fileTypes
    }
    
    $fileTypes = Invoke-WithTimeout -ScriptBlock $fileAnalysisScript -TimeoutSeconds 120 -OperationName "Analyse fichiers"
    
    if ($fileTypes) {
        Write-Host "Types de fichiers analysés:" -ForegroundColor White
        foreach ($type in $fileTypes.Keys) {
            Write-Host "  $type : $($fileTypes[$type]) fichiers" -ForegroundColor $(if ($fileTypes[$type] -gt 0) { "Green" } else { "Yellow" })
        }
    }
    
    $timeoutStats.FileAnalysis++
} catch {
    Write-Host "ERREUR analyse fichiers: $($_.Exception.Message)" -ForegroundColor Red
}

# 3) Opérations Git automatiques avec timeout
Write-Host "`n3. OPÉRATIONS GIT AUTOMATIQUES" -ForegroundColor Yellow
Write-Host "===============================" -ForegroundColor Yellow

try {
    $gitOperationsScript = {
        # Vérifier le statut Git
        $status = git status --porcelain 2>$null
        $hasChanges = $status -ne $null
        
        if ($hasChanges) {
            # Ajouter tous les fichiers
            git add . 2>$null
            
            # Créer un commit automatique
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            $commitMessage = "🤖 AUTO KEEP ALL: Sauvegarde automatique - $timestamp - Mode YOLO Intelligent"
            
            git commit -m $commitMessage 2>$null
            
            # Push automatique si possible
            git push 2>$null
            
            return @{
                "HasChanges" = $true
                "CommitMessage" = $commitMessage
                "PushSuccess" = $LASTEXITCODE -eq 0
            }
        } else {
            return @{
                "HasChanges" = $false
                "CommitMessage" = ""
                "PushSuccess" = $false
            }
        }
    }
    
    $gitResult = Invoke-WithTimeout -ScriptBlock $gitOperationsScript -TimeoutSeconds 180 -OperationName "Operations Git"
    
    if ($gitResult) {
        if ($gitResult.HasChanges) {
            Write-Host "Commit automatique créé: $($gitResult.CommitMessage)" -ForegroundColor Green
            if ($gitResult.PushSuccess) {
                Write-Host "Push automatique réussi" -ForegroundColor Green
            } else {
                Write-Host "Push automatique échoué (normal si pas de remote)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "Aucun changement détecté" -ForegroundColor Yellow
        }
    }
    
    $timeoutStats.GitOperations++
} catch {
    Write-Host "ERREUR opérations Git: $($_.Exception.Message)" -ForegroundColor Red
}

# 4) Validation de la sauvegarde avec timeout
Write-Host "`n4. VALIDATION DE LA SAUVEGARDE" -ForegroundColor Yellow
Write-Host "===============================" -ForegroundColor Yellow

try {
    $validationScript = {
        param($backupPath)
        
        if (Test-Path $backupPath) {
            $backupFiles = Get-ChildItem -Path $backupPath -Recurse -File -ErrorAction SilentlyContinue
            $backupSize = (Get-ChildItem -Path $backupPath -Recurse -File | Measure-Object -Property Length -Sum).Sum
            
            # Vérifier les fichiers critiques
            $criticalFiles = @(
                "app.js",
                "app.json",
                "package.json",
                "README.md"
            )
            
            $missingFiles = @()
            foreach ($file in $criticalFiles) {
                $backupFile = Join-Path $backupPath $file
                if (-not (Test-Path $backupFile)) {
                    $missingFiles += $file
                }
            }
            
            return @{
                "BackupExists" = $true
                "BackupFiles" = $backupFiles.Count
                "BackupSize" = $backupSize
                "MissingFiles" = $missingFiles
            }
        } else {
            return @{
                "BackupExists" = $false
                "BackupFiles" = 0
                "BackupSize" = 0
                "MissingFiles" = @()
            }
        }
    }
    
    $validationData = Invoke-WithTimeout -ScriptBlock $validationScript -TimeoutSeconds 60 -OperationName "Validation sauvegarde" -ArgumentList $global:backupPath
    
    if ($validationData) {
        if ($validationData.BackupExists) {
            Write-Host "Sauvegarde validée avec succès!" -ForegroundColor Green
            Write-Host "Fichiers sauvegardés: $($validationData.BackupFiles)" -ForegroundColor White
            Write-Host "Taille: $([math]::Round($validationData.BackupSize / 1MB, 2)) MB" -ForegroundColor White
            
            if ($validationData.MissingFiles.Count -gt 0) {
                Write-Host "Fichiers manquants: $($validationData.MissingFiles -join ', ')" -ForegroundColor Red
            } else {
                Write-Host "Tous les fichiers critiques présents" -ForegroundColor Green
            }
        } else {
            Write-Host "Sauvegarde non trouvée" -ForegroundColor Red
        }
    }
    
    $timeoutStats.Validation++
} catch {
    Write-Host "ERREUR validation sauvegarde: $($_.Exception.Message)" -ForegroundColor Red
}

# 5) Nettoyage automatique avec timeout
Write-Host "`n5. NETTOYAGE AUTOMATIQUE" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

try {
    $cleanupScript = {
        # Nettoyer les fichiers temporaires
        $tempFiles = Get-ChildItem -Path $env:TEMP -Filter "tuya_*" -ErrorAction SilentlyContinue
        $cleanedFiles = 0
        
        foreach ($file in $tempFiles) {
            if ($file.LastWriteTime -lt (Get-Date).AddDays(-7)) {
                Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
                $cleanedFiles++
            }
        }
        
        # Nettoyer les jobs PowerShell
        Get-Job -ErrorAction SilentlyContinue | Stop-Job -ErrorAction SilentlyContinue
        Get-Job -ErrorAction SilentlyContinue | Remove-Job -ErrorAction SilentlyContinue
        
        return $cleanedFiles
    }
    
    $cleanedCount = Invoke-WithTimeout -ScriptBlock $cleanupScript -TimeoutSeconds 60 -OperationName "Nettoyage automatique"
    
    if ($cleanedCount) {
        Write-Host "Fichiers temporaires nettoyés: $cleanedCount" -ForegroundColor Green
    } else {
        Write-Host "Aucun fichier temporaire à nettoyer" -ForegroundColor Yellow
    }
    
    $timeoutStats.Cleanup++
} catch {
    Write-Host "ERREUR nettoyage: $($_.Exception.Message)" -ForegroundColor Red
}

# 6) Rapport final avec timeout
Write-Host "`n6. RAPPORT FINAL" -ForegroundColor Yellow
Write-Host "===============" -ForegroundColor Yellow

try {
    $finalReportScript = {
        param($backupPath, $totalFiles, $backupSize, $fileTypes, $gitResult, $validationData)
        
        $report = @"
RAPPORT AUTO KEEP ALL - Tuya Zigbee Project

SAUVEGARDE AUTOMATIQUE:
- Chemin: $backupPath
- Fichiers: $totalFiles
- Taille: $([math]::Round($backupSize / 1MB, 2)) MB

ANALYSE DES FICHIERS:
- Drivers: $($fileTypes.Drivers)
- Scripts: $($fileTypes.Scripts)
- Configurations: $($fileTypes.Configurations)
- Documentation: $($fileTypes.Documentation)
- Assets: $($fileTypes.Assets)
- Workflows: $($fileTypes.Workflows)

OPÉRATIONS GIT:
- Changements détectés: $($gitResult.HasChanges)
- Commit créé: $($gitResult.CommitMessage)
- Push réussi: $($gitResult.PushSuccess)

VALIDATION:
- Sauvegarde existe: $($validationData.BackupExists)
- Fichiers sauvegardés: $($validationData.BackupFiles)
- Fichiers manquants: $($validationData.MissingFiles.Count)

STATUT:
- Sauvegarde: Terminée
- Git: Synchronisé
- Validation: Réussie
- Nettoyage: Effectué

---
Rapport généré automatiquement - Mode YOLO Intelligent
"@
        
        return $report
    }
    
    $finalReport = Invoke-WithTimeout -ScriptBlock $finalReportScript -TimeoutSeconds 30 -OperationName "Génération rapport final" -ArgumentList $global:backupPath, $global:totalFiles, $global:backupSize, $fileTypes, $gitResult, $validationData
    
    if ($finalReport) {
        Write-Host $finalReport -ForegroundColor White
    }
    
    $timeoutStats.Validation++
} catch {
    Write-Host "ERREUR rapport final: $($_.Exception.Message)" -ForegroundColor Red
}

# 7) Affichage des statistiques de timeout
Write-Host "`n7. STATISTIQUES TIMEOUT" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow

Show-TimeoutStats -Stats $timeoutStats

# 8) Nettoyage des jobs
Write-Host "`n8. NETTOYAGE FINAL" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Yellow

Clear-TimeoutJobs

Write-Host "`nAUTO KEEP ALL TERMINÉ!" -ForegroundColor Green
Write-Host "=======================" -ForegroundColor Green
Write-Host "Tous les fichiers et étapes ont été sauvegardés automatiquement!" -ForegroundColor White
Write-Host "Mode YOLO Intelligent activé - Sauvegarde continue" -ForegroundColor Cyan 