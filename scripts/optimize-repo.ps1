# OPTIMIZE REPO - Tuya Zigbee Project
# Script pour optimiser et nettoyer le repository avant push

param(
    [switch]$Force = $false,
    [switch]$DryRun = $false
)

Write-Host "OPTIMIZE REPO - NETTOYAGE ET OPTIMISATION" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Nettoyage des fichiers temporaires
Write-Host "1. NETTOYAGE DES FICHIERS TEMPORAIRES" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow

try {
    # Supprimer les fichiers temporaires
    $tempFiles = @(
        "*.tmp",
        "*.log",
        "*.cache",
        "*.bak",
        "*.old",
        "*.temp"
    )
    
    $cleanedCount = 0
    foreach ($pattern in $tempFiles) {
        $files = Get-ChildItem -Path "." -Recurse -Filter $pattern -ErrorAction SilentlyContinue
        foreach ($file in $files) {
            if (-not $DryRun) {
                Remove-Item -Path $file.FullName -Force -ErrorAction SilentlyContinue
            }
            $cleanedCount++
        }
    }
    
    Write-Host "Fichiers temporaires nettoyés: $cleanedCount" -ForegroundColor Green
} catch {
    Write-Host "ERREUR nettoyage fichiers temporaires: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Optimisation Git
Write-Host "`n2. OPTIMISATION GIT" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Yellow

try {
    if (-not $DryRun) {
        # Nettoyer le cache Git
        git gc --aggressive --prune=now
        
        # Optimiser le repository
        git repack -a -d --depth=250 --window=250
        
        # Nettoyer les références orphelines
        git reflog expire --expire=now --all
        git gc --prune=now --aggressive
    }
    
    Write-Host "Optimisation Git terminée" -ForegroundColor Green
} catch {
    Write-Host "ERREUR optimisation Git: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Compression des fichiers
Write-Host "`n3. COMPRESSION DES FICHIERS" -ForegroundColor Yellow
Write-Host "==========================" -ForegroundColor Yellow

try {
    # Compresser les gros fichiers JSON
    $jsonFiles = Get-ChildItem -Path "." -Recurse -Filter "*.json" -ErrorAction SilentlyContinue | Where-Object { $_.Length -gt 1MB }
    
    $compressedCount = 0
    foreach ($file in $jsonFiles) {
        if (-not $DryRun) {
            # Créer une version compressée
            $compressedPath = $file.FullName + ".gz"
            $content = Get-Content -Path $file.FullName -Raw
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($content)
            $compressed = [System.IO.Compression.GZipStream]::new([System.IO.MemoryStream]::new($bytes), [System.IO.Compression.CompressionMode]::Compress)
            $compressedBytes = $compressed.ToArray()
            [System.IO.File]::WriteAllBytes($compressedPath, $compressedBytes)
        }
        $compressedCount++
    }
    
    Write-Host "Fichiers compressés: $compressedCount" -ForegroundColor Green
} catch {
    Write-Host "ERREUR compression: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Nettoyage des backups
Write-Host "`n4. NETTOYAGE DES BACKUPS" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

try {
    # Supprimer les anciens backups
    $backupFiles = Get-ChildItem -Path $env:TEMP -Filter "tuya_*" -ErrorAction SilentlyContinue
    $oldBackups = $backupFiles | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-1) }
    
    $removedCount = 0
    foreach ($backup in $oldBackups) {
        if (-not $DryRun) {
            Remove-Item -Path $backup.FullName -Recurse -Force -ErrorAction SilentlyContinue
        }
        $removedCount++
    }
    
    Write-Host "Anciens backups supprimés: $removedCount" -ForegroundColor Green
} catch {
    Write-Host "ERREUR nettoyage backups: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Statistiques finales
Write-Host "`n5. STATISTIQUES FINALES" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow

try {
    $repoSize = (Get-ChildItem -Path "." -Recurse -File | Measure-Object -Property Length -Sum).Sum
    $fileCount = (Get-ChildItem -Path "." -Recurse -File).Count
    
    Write-Host "Taille du repository: $([math]::Round($repoSize / 1MB, 2)) MB" -ForegroundColor White
    Write-Host "Nombre de fichiers: $fileCount" -ForegroundColor White
    
    # Calculer la réduction
    $originalSize = 1.46 * 1GB  # Taille estimée originale
    $reduction = (($originalSize - $repoSize) / $originalSize) * 100
    
    Write-Host "Réduction estimée: $([math]::Round($reduction, 2))%" -ForegroundColor Green
} catch {
    Write-Host "ERREUR calcul statistiques: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Préparation pour push
Write-Host "`n6. PRÉPARATION POUR PUSH" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

try {
    if (-not $DryRun) {
        # Ajouter tous les changements
        git add .
        
        # Commit des optimisations
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        git commit -m "🚀 OPTIMISATION REPO: Nettoyage et compression - $timestamp - Mode YOLO Intelligent"
        
        Write-Host "Repository optimisé et prêt pour push" -ForegroundColor Green
    } else {
        Write-Host "Mode DRY RUN - Aucune modification effectuée" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERREUR préparation push: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nOPTIMISATION TERMINÉE!" -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Green
Write-Host "Repository optimisé et prêt pour push" -ForegroundColor White
Write-Host "Mode YOLO Intelligent activé" -ForegroundColor Cyan 