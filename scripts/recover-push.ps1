# RECOVER PUSH - Tuya Zigbee Project
# Script de récupération pour le push

Write-Host "RECOVER PUSH - RECUPERATION PUSH" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan

# 1. Vérification de l'état Git
Write-Host "1. VERIFICATION ETAT GIT" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

Write-Host "  Vérification de l'état Git..." -ForegroundColor Yellow

# 2. Configuration Git optimisée
Write-Host "`n2. CONFIGURATION GIT OPTIMISEE" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow

Write-Host "  Configuration Git optimisée..." -ForegroundColor Yellow
git config http.postBuffer 524288000
git config http.maxRequestBuffer 100M
git config core.compression 9
git config http.lowSpeedLimit 0
git config http.lowSpeedTime 999999

# 3. Tentative de push optimisé
Write-Host "`n3. TENTATIVE PUSH OPTIMISE" -ForegroundColor Yellow
Write-Host "===========================" -ForegroundColor Yellow

Write-Host "  Tentative de push optimisé..." -ForegroundColor Yellow

# Essayer plusieurs méthodes de push
$pushMethods = @(
    "git push --set-upstream origin feature/readme-update --force-with-lease",
    "git push --set-upstream origin feature/readme-update --force",
    "git push origin feature/readme-update --force-with-lease",
    "git push origin feature/readme-update --force"
)

foreach ($method in $pushMethods) {
    Write-Host "  Essai: $method" -ForegroundColor Yellow
    try {
        Invoke-Expression $method
        Write-Host "  Push réussi avec: $method" -ForegroundColor Green
        break
    } catch {
        Write-Host "  Échec avec: $method" -ForegroundColor Red
    }
}

# 4. Vérification finale
Write-Host "`n4. VERIFICATION FINALE" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow

Write-Host "  Vérification du statut..." -ForegroundColor Yellow
git status

Write-Host "`nRECOVER PUSH TERMINE!" -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Green
Write-Host "Récupération push terminée" -ForegroundColor White 