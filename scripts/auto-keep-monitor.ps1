# AUTO KEEP MONITOR - Tuya Zigbee Project
# Script de surveillance continue pour maintenir automatiquement toutes les sauvegardes

param(
    [int]$IntervalMinutes = 30,
    [switch]$Continuous = $true,
    [switch]$DryRun = $false
)

# Import du module timeout
$timeoutModulePath = Join-Path $PSScriptRoot "timeout-utils.ps1"
if (Test-Path $timeoutModulePath) {
    . $timeoutModulePath
    Set-TimeoutConfiguration -Environment "Production"
} else {
    Write-Host "Module timeout non trouve, utilisation des timeouts par defaut" -ForegroundColor Yellow
}

Write-Host "AUTO KEEP MONITOR - SURVEILLANCE CONTINUE" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Variables globales
$global:monitorStartTime = Get-Date
$global:backupCount = 0
$global:lastBackupTime = $null
$global:isRunning = $true

# Fonction de surveillance avec timeout
function Start-Monitoring {
    param($intervalMinutes)
    
    Write-Host "Démarrage de la surveillance continue..." -ForegroundColor Green
    Write-Host "Intervalle de sauvegarde: $intervalMinutes minutes" -ForegroundColor White
    Write-Host "Mode continu: $Continuous" -ForegroundColor White
    Write-Host "Appuyez sur Ctrl+C pour arrêter" -ForegroundColor Yellow
    
    while ($global:isRunning) {
        try {
            $currentTime = Get-Date
            $timeSinceLastBackup = if ($global:lastBackupTime) { $currentTime - $global:lastBackupTime } else { [TimeSpan]::MaxValue }
            
            # Vérifier si une sauvegarde est nécessaire
            if ($timeSinceLastBackup.TotalMinutes -ge $intervalMinutes) {
                Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] DÉMARRAGE SAUVEGARDE AUTOMATIQUE" -ForegroundColor Yellow
                
                # Exécuter la sauvegarde automatique
                $backupScript = {
                    param($backupNumber)
                    
                    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
                    $backupPath = Join-Path $env:TEMP "tuya_auto_backup_$timestamp"
                    
                    # Créer le dossier de sauvegarde
                    New-Item -ItemType Directory -Path $backupPath -Force | Out-Null
                    
                    # Copier tous les fichiers du projet
                    $files = Get-ChildItem -Path "." -Recurse -File -ErrorAction SilentlyContinue
                    $totalFiles = $files.Count
                    $copiedFiles = 0
                    
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
                        $copiedFiles++
                    }
                    
                    # Calculer la taille de la sauvegarde
                    $backupSize = (Get-ChildItem -Path $backupPath -Recurse -File | Measure-Object -Property Length -Sum).Sum
                    
                    # Créer un commit automatique
                    $status = git status --porcelain 2>$null
                    if ($status) {
                        git add . 2>$null
                        $commitMessage = "🤖 AUTO KEEP MONITOR: Sauvegarde #$backupNumber - $timestamp - Mode YOLO Intelligent"
                        git commit -m $commitMessage 2>$null
                        git push 2>$null
                    }
                    
                    return @{
                        "BackupPath" = $backupPath
                        "TotalFiles" = $totalFiles
                        "CopiedFiles" = $copiedFiles
                        "BackupSize" = $backupSize
                        "BackupNumber" = $backupNumber
                        "Timestamp" = $timestamp
                    }
                }
                
                $global:backupCount++
                $backupData = Invoke-WithTimeout -ScriptBlock $backupScript -TimeoutSeconds 300 -OperationName "Sauvegarde automatique" -ArgumentList $global:backupCount
                
                if ($backupData) {
                    $global:lastBackupTime = Get-Date
                    Write-Host "✅ Sauvegarde #$($backupData.BackupNumber) terminée avec succès!" -ForegroundColor Green
                    Write-Host "   Chemin: $($backupData.BackupPath)" -ForegroundColor White
                    Write-Host "   Fichiers: $($backupData.CopiedFiles)/$($backupData.TotalFiles)" -ForegroundColor White
                    Write-Host "   Taille: $([math]::Round($backupData.BackupSize / 1MB, 2)) MB" -ForegroundColor White
                    Write-Host "   Timestamp: $($backupData.Timestamp)" -ForegroundColor White
                } else {
                    Write-Host "❌ Échec de la sauvegarde automatique" -ForegroundColor Red
                }
            } else {
                $remainingMinutes = $intervalMinutes - [math]::Round($timeSinceLastBackup.TotalMinutes, 1)
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Prochaine sauvegarde dans $remainingMinutes minutes" -ForegroundColor Gray
            }
            
            # Afficher les statistiques
            $uptime = Get-Date - $global:monitorStartTime
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Uptime: $($uptime.Hours)h $($uptime.Minutes)m - Sauvegardes: $($global:backupCount)" -ForegroundColor Cyan
            
            # Attendre l'intervalle spécifié
            Start-Sleep -Seconds ($intervalMinutes * 60)
            
        } catch {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ERREUR surveillance: $($_.Exception.Message)" -ForegroundColor Red
            Start-Sleep -Seconds 60
        }
    }
}

# Fonction de nettoyage des anciennes sauvegardes
function Cleanup-OldBackups {
    try {
        $cleanupScript = {
            $tempFiles = Get-ChildItem -Path $env:TEMP -Filter "tuya_auto_backup_*" -ErrorAction SilentlyContinue
            $cleanedCount = 0
            
            foreach ($file in $tempFiles) {
                # Supprimer les sauvegardes de plus de 7 jours
                if ($file.LastWriteTime -lt (Get-Date).AddDays(-7)) {
                    Remove-Item -Path $file.FullName -Recurse -Force -ErrorAction SilentlyContinue
                    $cleanedCount++
                }
            }
            
            return $cleanedCount
        }
        
        $cleanedCount = Invoke-WithTimeout -ScriptBlock $cleanupScript -TimeoutSeconds 60 -OperationName "Nettoyage anciennes sauvegardes"
        
        if ($cleanedCount -gt 0) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Nettoyage: $cleanedCount anciennes sauvegardes supprimées" -ForegroundColor Green
        }
        
    } catch {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ERREUR nettoyage: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Fonction de validation de l'intégrité
function Validate-Integrity {
    try {
        $validationScript = {
            $criticalFiles = @(
                "app.js",
                "app.json", 
                "package.json",
                "README.md"
            )
            
            $missingFiles = @()
            foreach ($file in $criticalFiles) {
                if (-not (Test-Path $file)) {
                    $missingFiles += $file
                }
            }
            
            return @{
                "MissingFiles" = $missingFiles
                "IntegrityOK" = $missingFiles.Count -eq 0
            }
        }
        
        $validationData = Invoke-WithTimeout -ScriptBlock $validationScript -TimeoutSeconds 30 -OperationName "Validation intégrité"
        
        if ($validationData) {
            if ($validationData.IntegrityOK) {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ✅ Intégrité du projet OK" -ForegroundColor Green
            } else {
                Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ⚠️ Fichiers manquants: $($validationData.MissingFiles -join ', ')" -ForegroundColor Yellow
            }
        }
        
    } catch {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ERREUR validation: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Gestion de l'arrêt propre
function Stop-Monitoring {
    Write-Host "`n🛑 ARRÊT DE LA SURVEILLANCE" -ForegroundColor Yellow
    $global:isRunning = $false
    
    # Rapport final
    $uptime = Get-Date - $global:monitorStartTime
    Write-Host "`n📊 RAPPORT FINAL DE SURVEILLANCE" -ForegroundColor Cyan
    Write-Host "=================================" -ForegroundColor Cyan
    Write-Host "Temps de surveillance: $($uptime.Hours)h $($uptime.Minutes)m" -ForegroundColor White
    Write-Host "Sauvegardes effectuées: $($global:backupCount)" -ForegroundColor White
    Write-Host "Dernière sauvegarde: $($global:lastBackupTime)" -ForegroundColor White
    
    # Nettoyage final
    Cleanup-OldBackups
    Clear-TimeoutJobs
    
    Write-Host "`n✅ Surveillance arrêtée proprement" -ForegroundColor Green
    Write-Host "Mode YOLO Intelligent - Sauvegarde continue maintenue" -ForegroundColor Cyan
}

# Configuration du gestionnaire d'événements pour l'arrêt propre
Register-EngineEvent PowerShell.Exiting -Action { Stop-Monitoring }

# Démarrer la surveillance
try {
    Write-Host "🚀 DÉMARRAGE DU MONITEUR AUTO KEEP ALL" -ForegroundColor Green
    Write-Host "Mode YOLO Intelligent activé" -ForegroundColor Cyan
    
    # Validation initiale
    Validate-Integrity
    
    # Démarrer la surveillance continue
    Start-Monitoring -intervalMinutes $IntervalMinutes
    
} catch {
    Write-Host "❌ ERREUR CRITIQUE: $($_.Exception.Message)" -ForegroundColor Red
    Stop-Monitoring
} finally {
    # Nettoyage final
    Stop-Monitoring
} 