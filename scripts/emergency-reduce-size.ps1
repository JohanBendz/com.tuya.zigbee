# EMERGENCY REDUCE SIZE - Tuya Zigbee Project
# Script d'urgence pour réduire drastiquement la taille du repository

Write-Host "EMERGENCY REDUCE SIZE - REDUCTION DRASTIQUE" -ForegroundColor Red
Write-Host "===========================================" -ForegroundColor Red

# 1. Arrêter le push en cours
Write-Host "1. ARRET PUSH EN COURS" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow

Write-Host "  Arrêt du push en cours..." -ForegroundColor Yellow
# Ctrl+C pour arrêter le push

# 2. Nettoyage Git radical
Write-Host "`n2. NETTOYAGE GIT RADICAL" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

Write-Host "  Nettoyage Git radical..." -ForegroundColor Yellow
git reset --hard HEAD~1
git gc --aggressive --prune=now --force
git repack -a -d --depth=1 --window=1
git reflog expire --expire=now --all

# 3. Suppression des gros fichiers
Write-Host "`n3. SUPPRESSION GROS FICHIERS" -ForegroundColor Yellow
Write-Host "============================" -ForegroundColor Yellow

# Supprimer tous les fichiers > 1MB
$largeFiles = Get-ChildItem -Path "." -Recurse -File | Where-Object { $_.Length -gt 1MB }
foreach ($file in $largeFiles) {
    Remove-Item $file.FullName -Force
    $sizeMB = [math]::Round($file.Length / 1MB, 2)
    Write-Host "  Supprime: $($file.Name) ($sizeMB MB)" -ForegroundColor Red
}

# 4. Suppression des dossiers volumineux
Write-Host "`n4. SUPPRESSION DOSSIERS VOLUMINEUX" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow

$foldersToRemove = @(
    "node_modules",
    "dist",
    "build",
    "coverage",
    ".nyc_output",
    ".git/objects/pack",
    "assets",
    "images"
)

foreach ($folder in $foldersToRemove) {
    if (Test-Path $folder) {
        Remove-Item $folder -Recurse -Force
        Write-Host "  Dossier supprime: $folder" -ForegroundColor Red
    }
}

# 5. Optimisation des fichiers JSON
Write-Host "`n5. OPTIMISATION FICHIERS JSON" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow

$jsonFiles = Get-ChildItem -Path "." -Recurse -Filter "*.json" -ErrorAction SilentlyContinue
foreach ($file in $jsonFiles) {
    try {
        $content = Get-Content $file.FullName -Raw
        $json = $content | ConvertFrom-Json
        $compressed = $json | ConvertTo-Json -Compress -Depth 5
        Set-Content -Path $file.FullName -Value $compressed -Encoding UTF8
        Write-Host "  JSON optimise: $($file.Name)" -ForegroundColor Green
    } catch {
        # Ignorer les erreurs
    }
}

# 6. Suppression des rapports volumineux
Write-Host "`n6. SUPPRESSION RAPPORTS VOLUMINEUX" -ForegroundColor Yellow
Write-Host "===================================" -ForegroundColor Yellow

$reportFiles = Get-ChildItem -Path "." -Recurse -Filter "*RAPPORT*.md" -ErrorAction SilentlyContinue
foreach ($file in $reportFiles) {
    if ($file.Length -gt 10KB) {
        Remove-Item $file.FullName -Force
        Write-Host "  Rapport supprime: $($file.Name)" -ForegroundColor Red
    }
}

# 7. Commit minimal
Write-Host "`n7. COMMIT MINIMAL" -ForegroundColor Yellow
Write-Host "=================" -ForegroundColor Yellow

git add .
git commit -m "EMERGENCY: Reduction drastique de la taille" --allow-empty

# 8. Configuration Git pour push minimal
Write-Host "`n8. CONFIGURATION GIT MINIMAL" -ForegroundColor Yellow
Write-Host "============================" -ForegroundColor Yellow

git config http.postBuffer 1048576000
git config http.maxRequestBuffer 200M
git config core.compression 9
git config http.lowSpeedLimit 0
git config http.lowSpeedTime 999999

# 9. Calcul de la taille finale
Write-Host "`n9. CALCUL TAILLE FINALE" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow

$repoSize = 0
Get-ChildItem -Path "." -Recurse -File | ForEach-Object {
    $repoSize += $_.Length
}

$sizeMB = [math]::Round($repoSize / 1MB, 2)
Write-Host "  Taille finale: $sizeMB MB" -ForegroundColor Green

Write-Host "`nEMERGENCY REDUCE SIZE TERMINE!" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host "Repository reduit pour push d'urgence" -ForegroundColor White 