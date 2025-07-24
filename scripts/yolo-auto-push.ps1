# YOLO AUTO PUSH - Tuya Zigbee Project
# Script YOLO mode pour nettoyer, valider et pousser automatiquement

Write-Host "YOLO AUTO PUSH - MODE YOLO INTELLIGENT" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Variables globales
$yoloMode = $true
$autoValidate = $true
$autoPush = $true
$maxRetries = 3

# Fonction YOLO Clean
function YOLO-Clean {
    Write-Host "`n1. YOLO CLEAN - NETTOYAGE AUTOMATIQUE" -ForegroundColor Yellow
    Write-Host "=====================================" -ForegroundColor Yellow
    
    # Supprimer les archives volumineuses
    $archivesPath = "archives"
    if (Test-Path $archivesPath) {
        Write-Host "  Suppression du dossier archives..." -ForegroundColor Red
        Remove-Item $archivesPath -Recurse -Force
        Write-Host "  ✅ Archives supprimées" -ForegroundColor Green
    }
    
    # Supprimer tous les fichiers > 100MB
    $largeFiles = Get-ChildItem -Path "." -Recurse -File | Where-Object { $_.Length -gt 100MB }
    foreach ($file in $largeFiles) {
        Remove-Item $file.FullName -Force
        $sizeMB = [math]::Round($file.Length / 1MB, 2)
        Write-Host "  🗑️ Fichier volumineux supprimé: $($file.Name) ($sizeMB MB)" -ForegroundColor Red
    }
    
    # Supprimer les fichiers temporaires
    $tempPatterns = @("*.tmp", "*.log", "*.cache", "*.bak", "*.old", "*.backup", "*.zip", "*.rar", "*.7z")
    foreach ($pattern in $tempPatterns) {
        $files = Get-ChildItem -Path "." -Recurse -Filter $pattern -ErrorAction SilentlyContinue
        foreach ($file in $files) {
            Remove-Item $file.FullName -Force
            Write-Host "  🗑️ Fichier temporaire supprimé: $($file.Name)" -ForegroundColor Red
        }
    }
    
    # Nettoyage Git agressif
    Write-Host "  Nettoyage Git agressif..." -ForegroundColor Yellow
    git gc --aggressive --prune=now --force
    git repack -a -d --depth=1 --window=1
    git reflog expire --expire=now --all
}

# Fonction YOLO Validate
function YOLO-Validate {
    Write-Host "`n2. YOLO VALIDATE - VALIDATION AUTOMATIQUE" -ForegroundColor Yellow
    Write-Host "=========================================" -ForegroundColor Yellow
    
    # Vérifier la taille du repository
    $repoSize = 0
    Get-ChildItem -Path "." -Recurse -File | ForEach-Object {
        $repoSize += $_.Length
    }
    $sizeMB = [math]::Round($repoSize / 1MB, 2)
    Write-Host "  📊 Taille du repository: $sizeMB MB" -ForegroundColor White
    
    if ($sizeMB -gt 100) {
        Write-Host "  ⚠️ Repository trop volumineux ($sizeMB MB > 100 MB)" -ForegroundColor Red
        return $false
    } else {
        Write-Host "  ✅ Taille du repository OK ($sizeMB MB)" -ForegroundColor Green
    }
    
    # Vérifier les fichiers volumineux
    $largeFiles = Get-ChildItem -Path "." -Recurse -File | Where-Object { $_.Length -gt 50MB }
    if ($largeFiles.Count -gt 0) {
        Write-Host "  ⚠️ Fichiers volumineux détectés:" -ForegroundColor Red
        foreach ($file in $largeFiles) {
            $sizeMB = [math]::Round($file.Length / 1MB, 2)
            Write-Host "    - $($file.Name) ($sizeMB MB)" -ForegroundColor Red
        }
        return $false
    } else {
        Write-Host "  ✅ Aucun fichier volumineux détecté" -ForegroundColor Green
    }
    
    return $true
}

# Fonction YOLO Push
function YOLO-Push {
    Write-Host "`n3. YOLO PUSH - PUSH AUTOMATIQUE" -ForegroundColor Yellow
    Write-Host "===============================" -ForegroundColor Yellow
    
    # Configuration Git optimisée
    Write-Host "  Configuration Git optimisée..." -ForegroundColor Yellow
    git config http.postBuffer 1048576000
    git config http.maxRequestBuffer 200M
    git config core.compression 9
    git config http.lowSpeedLimit 0
    git config http.lowSpeedTime 999999
    
    # Ajouter tous les fichiers
    Write-Host "  Ajout des fichiers..." -ForegroundColor Yellow
    git add .
    
    # Commit automatique
    Write-Host "  Commit automatique..." -ForegroundColor Yellow
    git commit -m "🚀 YOLO AUTO PUSH: Nettoyage, validation et push automatique - Mode YOLO Intelligent" --allow-empty
    
    # Tentatives de push
    $pushMethods = @(
        "git push --set-upstream origin feature/readme-update --force-with-lease",
        "git push --set-upstream origin feature/readme-update --force",
        "git push origin feature/readme-update --force-with-lease",
        "git push origin feature/readme-update --force"
    )
    
    foreach ($method in $pushMethods) {
        Write-Host "  Tentative: $method" -ForegroundColor Yellow
        try {
            Invoke-Expression $method
            Write-Host "  ✅ Push réussi avec: $method" -ForegroundColor Green
            return $true
        } catch {
            Write-Host "  ❌ Échec avec: $method" -ForegroundColor Red
        }
    }
    
    return $false
}

# Fonction YOLO Monitor
function YOLO-Monitor {
    Write-Host "`n4. YOLO MONITOR - SURVEILLANCE AUTOMATIQUE" -ForegroundColor Yellow
    Write-Host "=========================================" -ForegroundColor Yellow
    
    # Surveillance continue
    $monitorInterval = 30 # secondes
    $maxIterations = 10
    
    for ($i = 1; $i -le $maxIterations; $i++) {
        Write-Host "  🔄 Cycle de surveillance $i/$maxIterations..." -ForegroundColor Yellow
        
        # Vérifier l'état Git
        $status = git status --porcelain
        if ($status) {
            Write-Host "  📝 Changements détectés, lancement YOLO Clean..." -ForegroundColor Yellow
            YOLO-Clean
            YOLO-Validate
            YOLO-Push
        } else {
            Write-Host "  ✅ Aucun changement détecté" -ForegroundColor Green
        }
        
        Start-Sleep -Seconds $monitorInterval
    }
}

# Fonction principale YOLO Mode
function Start-YOLOMode {
    Write-Host "🚀 DÉMARRAGE YOLO MODE INTELLIGENT" -ForegroundColor Cyan
    Write-Host "=================================" -ForegroundColor Cyan
    
    $retryCount = 0
    
    while ($retryCount -lt $maxRetries) {
        Write-Host "`n🔄 TENTATIVE $($retryCount + 1)/$maxRetries" -ForegroundColor Yellow
        
        # YOLO Clean
        YOLO-Clean
        
        # YOLO Validate
        if (YOLO-Validate) {
            Write-Host "  ✅ Validation réussie" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Validation échouée, nettoyage supplémentaire..." -ForegroundColor Red
            YOLO-Clean
            continue
        }
        
        # YOLO Push
        if (YOLO-Push) {
            Write-Host "  ✅ Push réussi!" -ForegroundColor Green
            break
        } else {
            Write-Host "  ❌ Push échoué, nouvelle tentative..." -ForegroundColor Red
            $retryCount++
        }
    }
    
    if ($retryCount -ge $maxRetries) {
        Write-Host "  ❌ Échec après $maxRetries tentatives" -ForegroundColor Red
        return $false
    }
    
    # Démarrer la surveillance
    Write-Host "`n🔄 DÉMARRAGE SURVEILLANCE YOLO" -ForegroundColor Cyan
    YOLO-Monitor
    
    return $true
}

# Démarrer le mode YOLO
Start-YOLOMode

Write-Host "`nYOLO AUTO PUSH TERMINÉ!" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host "Mode YOLO Intelligent activé sur Cursor" -ForegroundColor White 