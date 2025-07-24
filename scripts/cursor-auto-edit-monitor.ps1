# CURSOR AUTO EDIT MONITOR - Tuya Zigbee Project
# Script de surveillance continue pour l'édition automatique dans Cursor

param(
    [switch]$Force = $false,
    [switch]$Verbose = $false,
    [int]$Interval = 30  # secondes
)

Write-Host "CURSOR AUTO EDIT MONITOR - SURVEILLANCE CONTINUE" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# Variables globales
$global:isRunning = $true
$global:lastEditTime = Get-Date
$global:editCount = 0
$global:filesToWatch = @(
    "README.md",
    "app.json", 
    "package.json",
    "drivers/**/*.js",
    "drivers/**/*.json",
    ".github/workflows/*.yml",
    "scripts/*.ps1"
)

# Fonction d'édition automatique
function Start-AutoEdit {
    param($filesToWatch)
    
    $editedCount = 0
    
    foreach ($pattern in $filesToWatch) {
        $files = Get-ChildItem -Path $pattern -Recurse -ErrorAction SilentlyContinue
        foreach ($file in $files) {
            try {
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
                    if ($content -notmatch '"last_updated"') {
                        $content = $content -replace '}$', ',`n  "last_updated": "' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '"`n}'
                    }
                }
                
                # Sauvegarder si des changements ont été faits
                if ($content -ne $originalContent) {
                    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
                    $editedCount++
                    Write-Host "  ✅ $($file.Name) - Édité" -ForegroundColor Green
                }
                
            } catch {
                Write-Host "  ❌ Erreur édition $($file.Name): $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
    
    return $editedCount
}

# Fonction de surveillance continue
function Start-ContinuousMonitor {
    param($filesToWatch, $interval)
    
    Write-Host "Mode surveillance continue activé - Intervalle: $interval secondes" -ForegroundColor Cyan
    Write-Host "Appuyez sur Ctrl+C pour arrêter" -ForegroundColor Yellow
    
    while ($global:isRunning) {
        $currentTime = Get-Date
        $timeSinceLastEdit = $currentTime - $global:lastEditTime
        
        if ($timeSinceLastEdit.TotalSeconds -ge $interval) {
            Write-Host "`n🔄 Édition automatique - $($currentTime.ToString('HH:mm:ss'))" -ForegroundColor Yellow
            
            $editedCount = Start-AutoEdit -filesToWatch $filesToWatch
            
            if ($editedCount -gt 0) {
                $global:editCount += $editedCount
                Write-Host "  📊 $editedCount fichier(s) édité(s) - Total: $($global:editCount)" -ForegroundColor Green
            } else {
                Write-Host "  ℹ️ Aucun fichier à éditer" -ForegroundColor Yellow
            }
            
            $global:lastEditTime = $currentTime
            
            # Mettre à jour le fichier de statut
            $statusContent = @"
# CURSOR AUTO EDIT STATUS - Tuya Zigbee Project

## 📊 **STATUT D'ÉDITION AUTOMATIQUE**

### **🕐 Dernière édition**
- **Timestamp:** $($currentTime.ToString('yyyy-MM-dd HH:mm:ss')) UTC
- **Mode:** YOLO Intelligent
- **Statut:** Actif

### **📈 Statistiques**
- **Éditions totales:** $($global:editCount)
- **Dernière session:** $editedCount fichier(s)
- **Intervalle:** $interval secondes

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

### **🚀 Mode YOLO Intelligent activé**
*Édition automatique et continue*
"@
            
            Set-Content -Path "CURSOR-AUTO-EDIT-STATUS.md" -Value $statusContent -Encoding UTF8
        }
        
        Start-Sleep -Seconds 10
    }
}

# 1. Initialisation
Write-Host "1. INITIALISATION" -ForegroundColor Yellow
Write-Host "=================" -ForegroundColor Yellow

Write-Host "Configuration de la surveillance continue..." -ForegroundColor White
Write-Host "Intervalle d'édition: $Interval secondes" -ForegroundColor White
Write-Host "Fichiers surveillés: $($global:filesToWatch.Count)" -ForegroundColor White

# 2. Test initial
Write-Host "`n2. TEST INITIAL" -ForegroundColor Yellow
Write-Host "==============" -ForegroundColor Yellow

try {
    $initialEditCount = Start-AutoEdit -filesToWatch $global:filesToWatch
    
    if ($initialEditCount -gt 0) {
        Write-Host "Édition initiale: $initialEditCount fichier(s) édité(s)" -ForegroundColor Green
        $global:editCount = $initialEditCount
    } else {
        Write-Host "Aucune édition initiale nécessaire" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "ERREUR test initial: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Démarrage de la surveillance continue
Write-Host "`n3. SURVEILLANCE CONTINUE" -ForegroundColor Yellow
Write-Host "======================" -ForegroundColor Yellow

try {
    Start-ContinuousMonitor -filesToWatch $global:filesToWatch -interval $Interval
    
} catch {
    Write-Host "ERREUR surveillance continue: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Rapport final
Write-Host "`n4. RAPPORT FINAL" -ForegroundColor Yellow
Write-Host "===============" -ForegroundColor Yellow

$finalReport = @"
CURSOR AUTO EDIT MONITOR - RAPPORT FINAL

📊 STATISTIQUES:
- Fichiers surveillés: $($global:filesToWatch.Count)
- Éditions totales: $($global:editCount)
- Intervalle: $Interval secondes
- Mode: Surveillance continue

✅ ACTIONS EFFECTUÉES:
- Surveillance continue des fichiers
- Édition automatique des timestamps
- Optimisation des workflows
- Ajout du mode YOLO Intelligent
- Mise à jour continue des statuts

🚀 MODE YOLO INTELLIGENT ACTIVÉ
*Édition automatique et continue dans Cursor*
"@

Write-Host $finalReport -ForegroundColor White

Write-Host "`nCURSOR AUTO EDIT MONITOR TERMINÉ!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "L'édition automatique continue est maintenant active!" -ForegroundColor White
Write-Host "Mode YOLO Intelligent activé - Édition continue dans Cursor" -ForegroundColor Cyan 