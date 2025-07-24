# REDUCE REPO SIZE - Tuya Zigbee Project
# Script simple pour réduire la taille du repository

Write-Host "REDUCE REPO SIZE - REDUCTION DRASTIQUE" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# 1. Nettoyage Git agressif
Write-Host "1. NETTOYAGE GIT AGRESSIF" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

Write-Host "  Nettoyage Git..." -ForegroundColor Yellow
git gc --aggressive --prune=now --force
git repack -a -d --depth=1 --window=1
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# 2. Suppression des fichiers temporaires
Write-Host "`n2. SUPPRESSION FICHIERS TEMPORAIRES" -ForegroundColor Yellow
Write-Host "===================================" -ForegroundColor Yellow

$tempPatterns = @("*.tmp", "*.log", "*.cache", "*.bak", "*.old", "*.backup")
$filesRemoved = 0

foreach ($pattern in $tempPatterns) {
    $files = Get-ChildItem -Path "." -Recurse -Filter $pattern -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        Remove-Item $file.FullName -Force
        $filesRemoved++
        Write-Host "  Supprime: $($file.Name)" -ForegroundColor Red
    }
}

# 3. Suppression des fichiers volumineux
Write-Host "`n3. SUPPRESSION FICHIERS VOLUMINEUX" -ForegroundColor Yellow
Write-Host "===================================" -ForegroundColor Yellow

$largePatterns = @("*.zip", "*.tar.gz", "*.rar", "*.7z", "*.iso", "*.img", "*.bin")
foreach ($pattern in $largePatterns) {
    $files = Get-ChildItem -Path "." -Recurse -Filter $pattern -ErrorAction SilentlyContinue
    foreach ($file in $files) {
        if ($file.Length -gt 1MB) {
            Remove-Item $file.FullName -Force
            $filesRemoved++
            $sizeMB = [math]::Round($file.Length / 1MB, 2)
            Write-Host "  Fichier volumineux supprime: $($file.Name) ($sizeMB MB)" -ForegroundColor Red
        }
    }
}

# 4. Suppression des images volumineuses
Write-Host "`n4. SUPPRESSION IMAGES VOLUMINEUSES" -ForegroundColor Yellow
Write-Host "==================================" -ForegroundColor Yellow

$imageFiles = Get-ChildItem -Path "." -Recurse -Include "*.png", "*.jpg", "*.jpeg", "*.gif", "*.bmp" -ErrorAction SilentlyContinue
foreach ($image in $imageFiles) {
    if ($image.Length -gt 100KB) {
        Remove-Item $image.FullName -Force
        $filesRemoved++
        $sizeKB = [math]::Round($image.Length / 1KB, 2)
        Write-Host "  Image volumineuse supprimee: $($image.Name) ($sizeKB KB)" -ForegroundColor Red
    }
}

# 5. Suppression des dossiers non essentiels
Write-Host "`n5. SUPPRESSION DOSSIERS NON ESSENTIELS" -ForegroundColor Yellow
Write-Host "=======================================" -ForegroundColor Yellow

$foldersToRemove = @("node_modules", "dist", "build", "coverage", ".nyc_output")
foreach ($folder in $foldersToRemove) {
    if (Test-Path $folder) {
        Remove-Item $folder -Recurse -Force
        Write-Host "  Dossier supprime: $folder" -ForegroundColor Red
    }
}

# 6. Optimisation des fichiers JSON
Write-Host "`n6. OPTIMISATION FICHIERS JSON" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow

$jsonFiles = Get-ChildItem -Path "." -Recurse -Filter "*.json" -ErrorAction SilentlyContinue
$filesOptimized = 0

foreach ($file in $jsonFiles) {
    try {
        $content = Get-Content $file.FullName -Raw
        $json = $content | ConvertFrom-Json
        $compressed = $json | ConvertTo-Json -Compress -Depth 10
        Set-Content -Path $file.FullName -Value $compressed -Encoding UTF8
        $filesOptimized++
        Write-Host "  JSON optimise: $($file.Name)" -ForegroundColor Green
    } catch {
        # Ignorer les erreurs
    }
}

# 7. Optimisation finale Git
Write-Host "`n7. OPTIMISATION FINALE GIT" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

git add .
git commit -m "OPTIMIZATION: Reduction drastique de la taille du repository" --allow-empty
git gc --aggressive --prune=now
git repack -a -d --depth=1 --window=1

# 8. Rapport final
Write-Host "`n8. RAPPORT FINAL" -ForegroundColor Yellow
Write-Host "===============" -ForegroundColor Yellow

Write-Host "STATISTIQUES:" -ForegroundColor White
Write-Host "- Fichiers supprimes: $filesRemoved" -ForegroundColor Red
Write-Host "- Fichiers optimises: $filesOptimized" -ForegroundColor Green

# Calculer la taille du repository
$repoSize = 0
Get-ChildItem -Path "." -Recurse -File | ForEach-Object {
    $repoSize += $_.Length
}

$sizeMB = [math]::Round($repoSize / 1MB, 2)
Write-Host "- Taille du repository: $sizeMB MB" -ForegroundColor Green

Write-Host "`nREDUCE REPO SIZE TERMINE!" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host "Repository optimise pour push GitHub" -ForegroundColor White 