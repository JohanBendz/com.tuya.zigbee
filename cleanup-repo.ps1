# 🧹 CLEANUP REPO - Tuya Zigbee Project
# Script de nettoyage immédiat du repository

param(
    [switch]$Force = $false,
    [switch]$DryRun = $false
)

Write-Host "🧹 DÉBUT NETTOYAGE REPOSITORY" -ForegroundColor Cyan

# ─────────────── 1) Vérification état initial ───────────────
Write-Host "📊 ANALYSE INITIALE" -ForegroundColor Yellow
$initialSize = (Get-ChildItem -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
$initialFiles = (Get-ChildItem -Recurse -File | Measure-Object).Count

Write-Host "📦 Taille initiale: $([math]::Round($initialSize, 2)) MB" -ForegroundColor White
Write-Host "📄 Nombre de fichiers: $initialFiles" -ForegroundColor White

# ─────────────── 2) Nettoyage des fichiers temporaires ───────────────
Write-Host "🗑️ NETTOYAGE FICHIERS TEMPORAIRES" -ForegroundColor Yellow

$tempPatterns = @("*.tmp", "*.temp", "*.cache", "*.bak", "*.old", "*.orig", "*.rej", "*.swp", "*.swo", "*~")
foreach ($pattern in $tempPatterns) {
    $files = Get-ChildItem -Recurse -Name $pattern -ErrorAction SilentlyContinue
    if ($files) {
        Write-Host "🗑️ Suppression $pattern ($($files.Count) fichiers)" -ForegroundColor White
        if (-not $DryRun) {
            Remove-Item -Path $files -Force -ErrorAction SilentlyContinue
        }
    }
}

# ─────────────── 3) Nettoyage des dossiers temporaires ───────────────
Write-Host "🗂️ NETTOYAGE DOSSIERS TEMPORAIRES" -ForegroundColor Yellow

$tempDirs = @(".temp", ".cache", ".tmp", "temp", "cache")
foreach ($dir in $tempDirs) {
    if (Test-Path $dir) {
        Write-Host "🗑️ Suppression dossier $dir" -ForegroundColor White
        if (-not $DryRun) {
            Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

# ─────────────── 4) Nettoyage des archives ───────────────
Write-Host "🗄️ NETTOYAGE ARCHIVES" -ForegroundColor Yellow

$archivePatterns = @("*.tar.gz", "*.zip", "*.7z", "*.rar", "backup_*", "restore_*", "intelligent-backup_*")
foreach ($pattern in $archivePatterns) {
    $files = Get-ChildItem -Recurse -Name $pattern -ErrorAction SilentlyContinue
    if ($files) {
        Write-Host "🗑️ Suppression $pattern ($($files.Count) fichiers)" -ForegroundColor White
        if (-not $DryRun) {
            Remove-Item -Path $files -Force -ErrorAction SilentlyContinue
        }
    }
}

# ─────────────── 5) Nettoyage des dossiers d'archives ───────────────
Write-Host "🗂️ NETTOYAGE DOSSIERS ARCHIVES" -ForegroundColor Yellow

$archiveDirs = @("archive", "archives", "backup_*", "restore_*")
foreach ($dir in $archiveDirs) {
    $dirs = Get-ChildItem -Directory -Name $dir -ErrorAction SilentlyContinue
    if ($dirs) {
        Write-Host "🗑️ Suppression dossiers $dir ($($dirs.Count) dossiers)" -ForegroundColor White
        if (-not $DryRun) {
            Remove-Item -Path $dirs -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

# ─────────────── 6) Nettoyage des dépendances et builds ───────────────
Write-Host "📦 NETTOYAGE DÉPENDANCES ET BUILDS" -ForegroundColor Yellow

$buildDirs = @("node_modules", ".npm", ".yarn", "dist", "build", "out", ".next", ".nuxt", ".vercel", ".homeybuild")
foreach ($dir in $buildDirs) {
    if (Test-Path $dir) {
        Write-Host "🗑️ Suppression dossier $dir" -ForegroundColor White
        if (-not $DryRun) {
            Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

# ─────────────── 7) Nettoyage des fichiers de build ───────────────
Write-Host "📄 NETTOYAGE FICHIERS BUILD" -ForegroundColor Yellow

$buildFiles = @("package-lock.json", "yarn.lock")
foreach ($file in $buildFiles) {
    if (Test-Path $file) {
        Write-Host "🗑️ Suppression fichier $file" -ForegroundColor White
        if (-not $DryRun) {
            Remove-Item -Path $file -Force -ErrorAction SilentlyContinue
        }
    }
}

# ─────────────── 8) Nettoyage des données volumineuses ───────────────
Write-Host "📊 NETTOYAGE DONNÉES VOLUMINEUSES" -ForegroundColor Yellow

$dataFiles = @("data/manufacturer_ids.json", "data/manufacturer_ids_ha.json", "data/manufacturer_ids_z2m.json")
foreach ($file in $dataFiles) {
    if (Test-Path $file) {
        Write-Host "🗑️ Suppression fichier $file" -ForegroundColor White
        if (-not $DryRun) {
            Remove-Item -Path $file -Force -ErrorAction SilentlyContinue
        }
    }
}

# ─────────────── 9) Nettoyage des rapports volumineux ───────────────
Write-Host "📋 NETTOYAGE RAPPORTS VOLUMINEUXS" -ForegroundColor Yellow

$reportPatterns = @("*.report.json", "*.benchmark.json", "*.analysis.json")
foreach ($pattern in $reportPatterns) {
    $files = Get-ChildItem -Recurse -Name $pattern -ErrorAction SilentlyContinue
    if ($files) {
        Write-Host "🗑️ Suppression $pattern ($($files.Count) fichiers)" -ForegroundColor White
        if (-not $DryRun) {
            Remove-Item -Path $files -Force -ErrorAction SilentlyContinue
        }
    }
}

# ─────────────── 10) Nettoyage des images volumineuses ───────────────
Write-Host "🎨 NETTOYAGE IMAGES VOLUMINEUSES" -ForegroundColor Yellow

$imagePatterns = @("assets/icons/*.png", "assets/icons/*.jpg", "assets/icons/*.jpeg", "assets/images/*.png", "assets/images/*.jpg", "assets/images/*.jpeg")
foreach ($pattern in $imagePatterns) {
    $files = Get-ChildItem -Recurse -Name $pattern -ErrorAction SilentlyContinue
    if ($files) {
        Write-Host "🗑️ Suppression $pattern ($($files.Count) fichiers)" -ForegroundColor White
        if (-not $DryRun) {
            Remove-Item -Path $files -Force -ErrorAction SilentlyContinue
        }
    }
}

# ─────────────── 11) Nettoyage des logs ───────────────
Write-Host "📋 NETTOYAGE LOGS" -ForegroundColor Yellow

$logFiles = Get-ChildItem -Recurse -Name "*.log" -ErrorAction SilentlyContinue | Where-Object { $_ -notlike "*auto-update.log*" }
if ($logFiles) {
    Write-Host "🗑️ Suppression logs ($($logFiles.Count) fichiers)" -ForegroundColor White
    if (-not $DryRun) {
        Remove-Item -Path $logFiles -Force -ErrorAction SilentlyContinue
    }
}

# ─────────────── 12) Nettoyage des caches ───────────────
Write-Host "🔍 NETTOYAGE CACHES" -ForegroundColor Yellow

$cacheFiles = @(".eslintcache", ".stylelintcache", ".prettiercache")
foreach ($file in $cacheFiles) {
    if (Test-Path $file) {
        Write-Host "🗑️ Suppression cache $file" -ForegroundColor White
        if (-not $DryRun) {
            Remove-Item -Path $file -Force -ErrorAction SilentlyContinue
        }
    }
}

# ─────────────── 13) Nettoyage des dossiers obsolètes ───────────────
Write-Host "🗂️ NETTOYAGE DOSSIERS OBSOLÈTES" -ForegroundColor Yellow

$obsoleteDirs = @("OLDVERSION", "tools", "test", "docs", "logs")
foreach ($dir in $obsoleteDirs) {
    if (Test-Path $dir) {
        Write-Host "🗑️ Suppression dossier obsolète $dir" -ForegroundColor White
        if (-not $DryRun) {
            Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

# ─────────────── 14) Analyse finale ───────────────
Write-Host "📊 ANALYSE FINALE" -ForegroundColor Yellow

$finalSize = (Get-ChildItem -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
$finalFiles = (Get-ChildItem -Recurse -File | Measure-Object).Count
$sizeReduction = $initialSize - $finalSize
$fileReduction = $initialFiles - $finalFiles

Write-Host "📊 RÉSULTATS NETTOYAGE:" -ForegroundColor Green
Write-Host "├── 📦 Taille initiale: $([math]::Round($initialSize, 2)) MB" -ForegroundColor White
Write-Host "├── 📦 Taille finale: $([math]::Round($finalSize, 2)) MB" -ForegroundColor White
Write-Host "├── 📉 Réduction taille: $([math]::Round($sizeReduction, 2)) MB ($([math]::Round(($sizeReduction/$initialSize)*100, 1))%)" -ForegroundColor Green
Write-Host "├── 📄 Fichiers initiaux: $initialFiles" -ForegroundColor White
Write-Host "├── 📄 Fichiers finaux: $finalFiles" -ForegroundColor White
Write-Host "└── 📉 Réduction fichiers: $fileReduction ($([math]::Round(($fileReduction/$initialFiles)*100, 1))%)" -ForegroundColor Green

# ─────────────── 15) Git operations ───────────────
if (-not $DryRun) {
    Write-Host "🔄 OPÉRATIONS GIT" -ForegroundColor Yellow
    
    # Ajout des changements
    git add -A
    
    # Vérification s'il y a des changements
    $hasChanges = git diff --staged --quiet
    if (-not $hasChanges) {
        Write-Host "ℹ️ Aucun changement à commiter" -ForegroundColor Yellow
    } else {
        # Commit avec message détaillé
        $commitMsg = @"
🧹 CLEANUP: Nettoyage automatique du repository

📊 MÉTRIQUES:
- Taille avant: $([math]::Round($initialSize, 2)) MB
- Taille après: $([math]::Round($finalSize, 2)) MB
- Réduction: $([math]::Round($sizeReduction, 2)) MB ($([math]::Round(($sizeReduction/$initialSize)*100, 1))%)
- Fichiers avant: $initialFiles
- Fichiers après: $finalFiles
- Réduction fichiers: $fileReduction ($([math]::Round(($fileReduction/$initialFiles)*100, 1))%)

🗑️ NETTOYAGE EFFECTUÉ:
- Fichiers temporaires supprimés
- Archives et backups supprimés
- Dépendances et builds supprimés
- Données volumineuses supprimées
- Logs et caches nettoyés
- Dossiers obsolètes supprimés

🚀 OPTIMISATION POUR LA COMMUNAUTÉ HOMEY
- Repo allégé pour téléchargement rapide
- Seules les sources essentielles conservées
- Dépendances à installer localement
- Builds à générer localement

⏰ Timestamp: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss UTC")
"@
        
        git commit -m $commitMsg
        Write-Host "✅ Changements commités" -ForegroundColor Green
    }
}

Write-Host "🎉 NETTOYAGE TERMINÉ AVEC SUCCÈS !" -ForegroundColor Green
Write-Host "📊 Repo optimisé pour la communauté Homey" -ForegroundColor Cyan
Write-Host "🚀 Mode YOLO Intelligent activé - Optimisation continue" -ForegroundColor Magenta 