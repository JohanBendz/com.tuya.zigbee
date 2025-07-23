# SYNC DRIVERS - Tuya Zigbee Project
# Script de synchronisation des drivers

param(
    [string]$TemplatePath = "templates\driver.compose.json"
)

Write-Host "SYNCHRONISATION DES DRIVERS" -ForegroundColor Cyan

# Vérifier si le template existe
if (-not (Test-Path $TemplatePath)) {
    Write-Host "Template non trouvé: $TemplatePath" -ForegroundColor Red
    exit 1
}

# Parcourir tous les dossiers de drivers
Get-ChildItem -Path "drivers" -Directory | ForEach-Object {
    $driverComposePath = Join-Path $_.FullName "driver.compose.json"
    
    if (-not (Test-Path $driverComposePath)) {
        Write-Host "Copie du template vers $($_.Name)" -ForegroundColor Yellow
        Copy-Item -Path $TemplatePath -Destination $driverComposePath
        Write-Host "✅ $($_.Name) - Template copié" -ForegroundColor Green
    } else {
        Write-Host "ℹ️ $($_.Name) - Template déjà présent" -ForegroundColor White
    }
}

Write-Host "SYNCHRONISATION TERMINÉE" -ForegroundColor Green
