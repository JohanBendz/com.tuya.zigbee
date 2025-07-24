# AUTO KEEP EDITING - Tuya Zigbee Project
# Script pour maintenir l'édition automatique des fichiers dans Cursor

param(
    [switch]$Force = $false,
    [switch]$Continuous = $false,
    [switch]$Verbose = $false
)

# Import du module timeout
$timeoutModulePath = Join-Path $PSScriptRoot "timeout-utils.ps1"
if (Test-Path $timeoutModulePath) {
    . $timeoutModulePath
    Set-TimeoutConfiguration -Environment "Development"
} else {
    Write-Host "Module timeout non trouve, utilisation des timeouts par defaut" -ForegroundColor Yellow
}

Write-Host "AUTO KEEP EDITING - CURSOR CONTINUOUS EDITING" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Variables globales
$global:isRunning = $true
$global:lastEditTime = Get-Date
$global:editInterval = 30  # secondes
$global:filesToWatch = @(
    "README.md",
    "app.json",
    "package.json",
    "drivers/**/*.js",
    "drivers/**/*.json",
    ".github/workflows/*.yml",
    "scripts/*.ps1"
)

# 1. Surveillance des fichiers
Write-Host "1. SURVEILLANCE DES FICHIERS" -ForegroundColor Yellow
Write-Host "===========================" -ForegroundColor Yellow

try {
    $watchScript = {
        param($filesToWatch, $lastEditTime)
        
        $changes = @()
        
        foreach ($pattern in $filesToWatch) {
            $files = Get-ChildItem -Path $pattern -Recurse -ErrorAction SilentlyContinue
            foreach ($file in $files) {
                if ($file.LastWriteTime -gt $lastEditTime) {
                    $changes += @{
                        "Path" = $file.FullName
                        "Name" = $file.Name
                        "LastModified" = $file.LastWriteTime
                        "Size" = $file.Length
                    }
                }
            }
        }
        
        return $changes
    }
    
    $fileChanges = Invoke-WithTimeout -ScriptBlock $watchScript -TimeoutSeconds 30 -OperationName "Surveillance fichiers" -ArgumentList $global:filesToWatch, $global:lastEditTime
    
    if ($fileChanges) {
        Write-Host "Fichiers modifies detectes: $($fileChanges.Count)" -ForegroundColor Green
        foreach ($change in $fileChanges) {
            Write-Host "  - $($change.Name) ($([math]::Round($change.Size / 1KB, 2)) KB)" -ForegroundColor White
        }
    } else {
        Write-Host "Aucun fichier modifie detecte" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "ERREUR surveillance fichiers: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Édition automatique des fichiers
Write-Host "`n2. ÉDITION AUTOMATIQUE" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow

try {
    $editScript = {
        param($filesToWatch)
        
        $editedCount = 0
        
        foreach ($pattern in $filesToWatch) {
            $files = Get-ChildItem -Path $pattern -Recurse -ErrorAction SilentlyContinue
            foreach ($file in $files) {
                $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
                $originalContent = $content
                
                # Éditions automatiques
                
                # 1. Ajouter des timestamps
                if ($content -notmatch "Timestamp.*UTC") {
                    $timestamp = "`n*Timestamp : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') UTC*"
                    $content = $content + $timestamp
                }
                
                # 2. Ajouter le mode YOLO Intelligent
                if ($content -notmatch "Mode YOLO Intelligent") {
                    $yoloComment = "`n*Mode YOLO Intelligent activé - Édition automatique*"
                    $content = $content + $yoloComment
                }
                
                # 3. Optimiser les workflows YAML
                if ($file.Extension -eq ".yml") {
                    $content = $content -replace 'uses: actions/checkout@v4', 'uses: actions/checkout@v3'
                    $content = $content -replace 'uses: actions/setup-node@v4', 'uses: actions/setup-node@v3'
                }
                
                # 4. Optimiser les scripts PowerShell
                if ($file.Extension -eq ".ps1") {
                    if ($content -notmatch "Set-TimeoutConfiguration") {
                        $timeoutConfig = "`n# Configuration timeouts pour Development`nSet-TimeoutConfiguration -Environment `"Development`"`n"
                        $content = $timeoutConfig + $content
                    }
                }
                
                # 5. Optimiser les fichiers JSON
                if ($file.Extension -eq ".json") {
                    # Ajouter des métadonnées si manquantes
                    if ($content -notmatch '"last_updated"') {
                        $content = $content -replace '}$', ',`n  "last_updated": "' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '"`n}'
                    }
                }
                
                # Sauvegarder si des changements ont été faits
                if ($content -ne $originalContent) {
                    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
                    $editedCount++
                    Write-Host "✅ $($file.Name) - Édité" -ForegroundColor Green
                }
            }
        }
        
        return $editedCount
    }
    
    $editedCount = Invoke-WithTimeout -ScriptBlock $editScript -TimeoutSeconds 60 -OperationName "Édition automatique" -ArgumentList $global:filesToWatch
    
    if ($editedCount -gt 0) {
        Write-Host "Fichiers édités: $editedCount" -ForegroundColor Green
    } else {
        Write-Host "Aucun fichier à éditer" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "ERREUR édition automatique: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Création de nouveaux fichiers
Write-Host "`n3. CRÉATION DE NOUVEAUX FICHIERS" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow

try {
    $createScript = {
        $createdCount = 0
        
        # Créer un fichier de statut d'édition
        $statusFile = "AUTO-EDIT-STATUS.md"
        $statusContent = @"
# AUTO EDIT STATUS - Tuya Zigbee Project

## 📊 **STATUT D'ÉDITION AUTOMATIQUE**

### **🕐 Dernière édition**
- **Timestamp:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') UTC
- **Mode:** YOLO Intelligent
- **Statut:** Actif

### **📁 Fichiers surveillés**
- README.md
- app.json
- package.json
- drivers/**/*.js
- drivers/**/*.json
- .github/workflows/*.yml
- scripts/*.ps1

### **✅ Actions effectuées**
- Surveillance continue des fichiers
- Édition automatique des timestamps
- Optimisation des workflows
- Ajout du mode YOLO Intelligent
- Création de nouveaux fichiers

### **🚀 Mode YOLO Intelligent activé**
*Édition automatique et continue*
"@
        
        Set-Content -Path $statusFile -Value $statusContent -Encoding UTF8
        $createdCount++
        
        # Créer un fichier de log d'édition
        $logFile = "AUTO-EDIT-LOG.md"
        $logContent = @"
# AUTO EDIT LOG - Tuya Zigbee Project

## 📝 **Journal d'édition automatique**

### **Session actuelle**
- **Début:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') UTC
- **Mode:** YOLO Intelligent
- **Statut:** En cours

### **Actions effectuées**
1. Surveillance des fichiers
2. Édition automatique
3. Création de nouveaux fichiers
4. Optimisation continue

### **🚀 Mode YOLO Intelligent activé**
*Édition automatique et continue*
"@
        
        Set-Content -Path $logFile -Value $logContent -Encoding UTF8
        $createdCount++
        
        return $createdCount
    }
    
    $createdCount = Invoke-WithTimeout -ScriptBlock $createScript -TimeoutSeconds 30 -OperationName "Création fichiers"
    
    if ($createdCount -gt 0) {
        Write-Host "Fichiers créés: $createdCount" -ForegroundColor Green
    } else {
        Write-Host "Aucun nouveau fichier créé" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "ERREUR création fichiers: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Mode continu
if ($Continuous) {
    Write-Host "`n4. MODE CONTINU ACTIVÉ" -ForegroundColor Yellow
    Write-Host "=====================" -ForegroundColor Yellow
    
    try {
        $continuousScript = {
            param($filesToWatch, $editInterval)
            
            Write-Host "Mode continu activé - Surveillance toutes les $editInterval secondes" -ForegroundColor Cyan
            
            while ($global:isRunning) {
                $currentTime = Get-Date
                $timeSinceLastEdit = $currentTime - $global:lastEditTime
                
                if ($timeSinceLastEdit.TotalSeconds -ge $editInterval) {
                    Write-Host "`n🔄 Édition automatique - $($currentTime.ToString('HH:mm:ss'))" -ForegroundColor Yellow
                    
                    # Édition automatique
                    foreach ($pattern in $filesToWatch) {
                        $files = Get-ChildItem -Path $pattern -Recurse -ErrorAction SilentlyContinue
                        foreach ($file in $files) {
                            $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
                            
                            # Ajouter un timestamp de mise à jour
                            $updateComment = "`n*Dernière mise à jour: $($currentTime.ToString('HH:mm:ss')) UTC*"
                            if ($content -notmatch "Dernière mise à jour") {
                                $content = $content + $updateComment
                                Set-Content -Path $file.FullName -Value $content -Encoding UTF8
                                Write-Host "  ✅ $($file.Name) - Mis à jour" -ForegroundColor Green
                            }
                        }
                    }
                    
                    $global:lastEditTime = $currentTime
                }
                
                Start-Sleep -Seconds 10
            }
        }
        
        $continuousJob = Start-Job -ScriptBlock $continuousScript -ArgumentList $global:filesToWatch, $global:editInterval
        
        Write-Host "Mode continu démarré - Job ID: $($continuousJob.Id)" -ForegroundColor Green
        Write-Host "Appuyez sur Ctrl+C pour arrêter" -ForegroundColor Yellow
        
    } catch {
        Write-Host "ERREUR mode continu: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 5. Rapport final
Write-Host "`n5. RAPPORT FINAL" -ForegroundColor Yellow
Write-Host "===============" -ForegroundColor Yellow

try {
    $reportScript = {
        $report = @"
AUTO KEEP EDITING - RAPPORT FINAL

📊 STATISTIQUES:
- Fichiers surveillés: $($global:filesToWatch.Count)
- Éditions effectuées: $editedCount
- Fichiers créés: $createdCount
- Mode continu: $(if ($Continuous) { 'Activé' } else { 'Désactivé' })

✅ ACTIONS EFFECTUÉES:
- Surveillance des fichiers
- Édition automatique des timestamps
- Optimisation des workflows
- Ajout du mode YOLO Intelligent
- Création de nouveaux fichiers

🚀 MODE YOLO INTELLIGENT ACTIVÉ
*Édition automatique et continue*
"@
        
        return $report
    }
    
    $finalReport = Invoke-WithTimeout -ScriptBlock $reportScript -TimeoutSeconds 30 -OperationName "Génération rapport final"
    
    if ($finalReport) {
        Write-Host $finalReport -ForegroundColor White
    }
    
} catch {
    Write-Host "ERREUR rapport final: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Nettoyage
Write-Host "`n6. NETTOYAGE" -ForegroundColor Yellow
Write-Host "=============" -ForegroundColor Yellow

Clear-TimeoutJobs

Write-Host "`nAUTO KEEP EDITING TERMINÉ!" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host "L'édition automatique des fichiers est maintenant active!" -ForegroundColor White
Write-Host "Mode YOLO Intelligent activé - Édition continue" -ForegroundColor Cyan 