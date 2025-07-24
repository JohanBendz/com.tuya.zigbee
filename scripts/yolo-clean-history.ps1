# YOLO CLEAN HISTORY - Tuya Zigbee Project
# Script pour nettoyer complètement l'historique Git des fichiers volumineux

Write-Host "YOLO CLEAN HISTORY - NETTOYAGE HISTORIQUE GIT" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Nettoyage des fichiers volumineux de l'historique
Write-Host "1. NETTOYAGE HISTORIQUE GIT" -ForegroundColor Yellow
Write-Host "==========================" -ForegroundColor Yellow

Write-Host "  Suppression des fichiers volumineux de l'historique..." -ForegroundColor Yellow

# Supprimer les fichiers volumineux de l'historique Git
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch "archives/backup tuya.zip" "archives/backup.zip"' --prune-empty --tag-name-filter cat -- --all

# 2. Nettoyage Git agressif
Write-Host "`n2. NETTOYAGE GIT AGRESSIF" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

Write-Host "  Nettoyage Git agressif..." -ForegroundColor Yellow
git gc --aggressive --prune=now --force
git repack -a -d --depth=1 --window=1
git reflog expire --expire=now --all

# 3. Suppression des références
Write-Host "`n3. SUPPRESSION RÉFÉRENCES" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

Write-Host "  Suppression des références..." -ForegroundColor Yellow
git for-each-ref --format='delete %(refname)' refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 4. Vérification de la taille
Write-Host "`n4. VÉRIFICATION TAILLE" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow

$repoSize = 0
Get-ChildItem -Path "." -Recurse -File | ForEach-Object {
    $repoSize += $_.Length
}
$sizeMB = [math]::Round($repoSize / 1MB, 2)
Write-Host "  Taille du repository: $sizeMB MB" -ForegroundColor Green

# 5. Commit de nettoyage
Write-Host "`n5. COMMIT NETTOYAGE" -ForegroundColor Yellow
Write-Host "===================" -ForegroundColor Yellow

Write-Host "  Commit de nettoyage..." -ForegroundColor Yellow
git add .
git commit -m "🚀 YOLO CLEAN HISTORY: Nettoyage complet de l'historique Git - Fichiers volumineux supprimés"

# 6. Configuration Git optimisée
Write-Host "`n6. CONFIGURATION GIT OPTIMISÉE" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow

Write-Host "  Configuration Git optimisée..." -ForegroundColor Yellow
git config http.postBuffer 1048576000
git config http.maxRequestBuffer 200M
git config core.compression 9
git config http.lowSpeedLimit 0
git config http.lowSpeedTime 999999

Write-Host "`nYOLO CLEAN HISTORY TERMINÉ!" -ForegroundColor Green
Write-Host "============================" -ForegroundColor Green
Write-Host "Historique Git nettoyé des fichiers volumineux" -ForegroundColor White 