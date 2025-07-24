# CLEANUP REPO - Tuya Zigbee Project
# Script de nettoyage local pour optimiser le repo

param(
    [switch]$Force = $false,
    [switch]$DryRun = $false
)

Write-Host "NETTOYAGE DU REPOSITORY" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

# 1) Analyse avant nettoyage
Write-Host "1. ANALYSE AVANT NETTOYAGE" -ForegroundColor Yellow
Write-Host "==========================" -ForegroundColor Yellow

$beforeSize = (Get-ChildItem -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
$beforeFiles = (Get-ChildItem -Recurse -File | Measure-Object).Count

Write-Host "Taille avant: $([math]::Round($beforeSize, 2)) MB" -ForegroundColor White
Write-Host "Fichiers avant: $beforeFiles" -ForegroundColor White

# 2) Nettoyage des fichiers temporaires
Write-Host "`n2. NETTOYAGE FICHIERS TEMPORAIRES" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow

$tempPatterns = @("*.tmp", "*.temp", "*.cache", "*.bak", "*.old", "*.orig", "*.rej", "*.swp", "*.swo", "*~")
$tempFiles = @()

foreach ($pattern in $tempPatterns) {
    $files = Get-ChildItem -Path . -Filter $pattern -Recurse -ErrorAction SilentlyContinue
    $tempFiles += $files
    if ($files) {
        Write-Host "Trouvé $($files.Count) fichiers $pattern" -ForegroundColor White
        if (-not $DryRun) {
            $files | Remove-Item -Force
            Write-Host "Supprimé $($files.Count) fichiers $pattern" -ForegroundColor Green
        }
    }
}

# 3) Nettoyage des dossiers de build
Write-Host "`n3. NETTOYAGE DOSSIERS BUILD" -ForegroundColor Yellow
Write-Host "============================" -ForegroundColor Yellow

$buildDirs = @("node_modules", "dist", "build", "out", ".next", ".nuxt", ".vercel", ".homeybuild")
$buildDirs += @(".homeycompose/cache", ".homeycompose/temp", ".cache", ".temp", ".tmp")

foreach ($dir in $buildDirs) {
    if (Test-Path $dir) {
        $size = (Get-ChildItem -Path $dir -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
        Write-Host "Dossier $dir trouvé ($([math]::Round($size, 2)) MB)" -ForegroundColor White
        if (-not $DryRun) {
            Remove-Item -Path $dir -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "Supprimé $dir" -ForegroundColor Green
        }
    }
}

# 4) Nettoyage des fichiers de lock
Write-Host "`n4. NETTOYAGE FICHIERS LOCK" -ForegroundColor Yellow
Write-Host "============================" -ForegroundColor Yellow

$lockFiles = @("package-lock.json", "yarn.lock", "pnpm-lock.yaml")
foreach ($file in $lockFiles) {
    if (Test-Path $file) {
        $size = (Get-Item $file).Length / 1KB
        Write-Host "Fichier $file trouvé ($([math]::Round($size, 2)) KB)" -ForegroundColor White
        if (-not $DryRun) {
            Remove-Item -Path $file -Force
            Write-Host "Supprimé $file" -ForegroundColor Green
        }
    }
}

# 5) Nettoyage des logs
Write-Host "`n5. NETTOYAGE LOGS" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Yellow

$logFiles = Get-ChildItem -Path . -Filter "*.log" -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne "auto-update.log" }
if ($logFiles) {
    Write-Host "Trouvé $($logFiles.Count) fichiers log" -ForegroundColor White
    if (-not $DryRun) {
        $logFiles | Remove-Item -Force
        Write-Host "Supprimé $($logFiles.Count) fichiers log" -ForegroundColor Green
    }
}

# 6) Nettoyage des archives
Write-Host "`n6. NETTOYAGE ARCHIVES" -ForegroundColor Yellow
Write-Host "======================" -ForegroundColor Yellow

$archivePatterns = @("*.tar.gz", "*.zip", "*.7z", "*.rar")
$archiveFiles = @()

foreach ($pattern in $archivePatterns) {
    $files = Get-ChildItem -Path . -Filter $pattern -Recurse -ErrorAction SilentlyContinue
    $archiveFiles += $files
    if ($files) {
        Write-Host "Trouvé $($files.Count) fichiers $pattern" -ForegroundColor White
        if (-not $DryRun) {
            $files | Remove-Item -Force
            Write-Host "Supprimé $($files.Count) fichiers $pattern" -ForegroundColor Green
        }
    }
}

# 7) Nettoyage des dossiers d'archives
Write-Host "`n7. NETTOYAGE DOSSIERS ARCHIVES" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow

$archiveDirs = @("archives", "backup_*", "restore_*", "intelligent-backup_*")
foreach ($dir in $archiveDirs) {
    $foundDirs = Get-ChildItem -Path . -Directory -Filter $dir -ErrorAction SilentlyContinue
    if ($foundDirs) {
        foreach ($foundDir in $foundDirs) {
            $size = (Get-ChildItem -Path $foundDir.FullName -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum / 1MB
            Write-Host "Dossier $($foundDir.Name) trouvé ($([math]::Round($size, 2)) MB)" -ForegroundColor White
            if (-not $DryRun) {
                Remove-Item -Path $foundDir.FullName -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "Supprimé $($foundDir.Name)" -ForegroundColor Green
            }
        }
    }
}

# 8) Analyse après nettoyage
Write-Host "`n8. ANALYSE APRÈS NETTOYAGE" -ForegroundColor Yellow
Write-Host "===========================" -ForegroundColor Yellow

$afterSize = (Get-ChildItem -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
$afterFiles = (Get-ChildItem -Recurse -File | Measure-Object).Count

Write-Host "Taille après: $([math]::Round($afterSize, 2)) MB" -ForegroundColor White
Write-Host "Fichiers après: $afterFiles" -ForegroundColor White

# 9) Calcul des économies
Write-Host "`n9. CALCUL ÉCONOMIES" -ForegroundColor Yellow
Write-Host "===================" -ForegroundColor Yellow

$sizeSaved = $beforeSize - $afterSize
$filesSaved = $beforeFiles - $afterFiles
$percentSize = if ($beforeSize -gt 0) { ($sizeSaved * 100) / $beforeSize } else { 0 }
$percentFiles = if ($beforeFiles -gt 0) { ($filesSaved * 100) / $beforeFiles } else { 0 }

Write-Host "Taille économisée: $([math]::Round($sizeSaved, 2)) MB ($([math]::Round($percentSize, 1))%)" -ForegroundColor Green
Write-Host "Fichiers supprimés: $filesSaved ($([math]::Round($percentFiles, 1))%)" -ForegroundColor Green

# 10) Rapport final
Write-Host "`n📊 RAPPORT FINAL" -ForegroundColor Green
Write-Host "===============" -ForegroundColor Green
Write-Host "Taille avant: $([math]::Round($beforeSize, 2)) MB" -ForegroundColor White
Write-Host "Taille après: $([math]::Round($afterSize, 2)) MB" -ForegroundColor White
Write-Host "Économie: $([math]::Round($sizeSaved, 2)) MB ($([math]::Round($percentSize, 1))%)" -ForegroundColor Green
Write-Host "Fichiers supprimés: $filesSaved ($([math]::Round($percentFiles, 1))%)" -ForegroundColor Green

if (-not $DryRun) {
    Write-Host "`n✅ NETTOYAGE TERMINÉ AVEC SUCCÈS" -ForegroundColor Green
    Write-Host "📊 Repo optimisé pour la communauté Homey" -ForegroundColor Cyan
} else {
    Write-Host "`n🔍 Mode DryRun - Aucune modification effectuée" -ForegroundColor Yellow
}

Write-Host "⏰ Timestamp: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss UTC")" -ForegroundColor White 