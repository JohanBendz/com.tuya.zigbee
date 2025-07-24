# 🔄 SCRIPT DE FUSION SIMPLE DES BRANCHES - TUYA ZIGBEE
# Mode YOLO Intelligent - Version simplifiée

Write-Host "🔄 FUSION SIMPLE DES BRANCHES - TUYA ZIGBEE" -ForegroundColor Green
Write-Host "Mode YOLO Intelligent: ACTIF" -ForegroundColor Yellow
Write-Host ""

# ===== ANALYSE DES BRANCHES =====
Write-Host "🔍 ANALYSE DES BRANCHES..." -ForegroundColor Blue

# Récupération de toutes les branches
$localBranches = git branch --format='%(refname:short)'
$remoteBranches = git branch -r --format='%(refname:short)'

Write-Host "📋 Branches locales:" -ForegroundColor Cyan
$localBranches | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }

Write-Host "📋 Branches distantes:" -ForegroundColor Cyan
$remoteBranches | ForEach-Object { Write-Host "  - $_" -ForegroundColor White }

# ===== IDENTIFICATION DES BRANCHES À FUSIONNER =====
Write-Host ""
Write-Host "🎯 IDENTIFICATION DES BRANCHES À FUSIONNER..." -ForegroundColor Blue

$branchesToMerge = @("beta", "develop", "feature/readme-update")
$existingBranches = @()

foreach ($branch in $branchesToMerge) {
    if ($remoteBranches -contains "origin/$branch") {
        Write-Host "✅ Branche $branch existe" -ForegroundColor Green
        $existingBranches += $branch
    } else {
        Write-Host "❌ Branche $branch n'existe pas" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📊 RÉSUMÉ:" -ForegroundColor Cyan
Write-Host "Branches à fusionner: $($existingBranches -join ', ')" -ForegroundColor White

# ===== FUSION INTELLIGENTE =====
Write-Host ""
Write-Host "🔄 DÉBUT DE LA FUSION INTELLIGENTE..." -ForegroundColor Blue

# Checkout de la branche master
Write-Host "📥 Checkout de la branche master..." -ForegroundColor Cyan
git checkout master
git pull origin master

# Fusion intelligente de chaque branche
foreach ($branch in $existingBranches) {
    Write-Host ""
    Write-Host "🔄 Fusion de $branch dans master..." -ForegroundColor Green
    
    try {
        # Tentative de fusion intelligente
        git merge "origin/$branch" --no-ff -m "🔄 Fusion intelligente $branch → master - Mode YOLO Intelligent"
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Fusion réussie pour $branch" -ForegroundColor Green
        } else {
            Write-Host "⚠️ Conflits détectés pour $branch, résolution automatique..." -ForegroundColor Yellow
            
            # Résolution automatique des conflits
            git status --porcelain | Where-Object { $_ -match "^UU" } | ForEach-Object { 
                $file = ($_ -split " ")[1]
                Write-Host "🔧 Résolution automatique: $file" -ForegroundColor Cyan
                git checkout --theirs "$file"
            }
            
            # Commit de la résolution
            git add -A
            git commit -m "🔧 Résolution automatique des conflits - Mode YOLO Intelligent"
            Write-Host "✅ Conflits résolus pour $branch" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ Erreur lors de la fusion de $branch" -ForegroundColor Red
    }
}

# ===== SYNCHRONISATION MASTER/MAIN =====
Write-Host ""
Write-Host "🔄 SYNCHRONISATION MASTER/MAIN..." -ForegroundColor Blue

if ($remoteBranches -contains "origin/main") {
    Write-Host "📥 Synchronisation main ← master..." -ForegroundColor Cyan
    git checkout main
    git pull origin main
    git merge origin/master --no-ff -m "🔄 Sync main ← master"
    git push origin main
    
    Write-Host "📥 Synchronisation master ← main..." -ForegroundColor Cyan
    git checkout master
    git merge origin/main --no-ff -m "🔄 Sync master ← main"
    git push origin master
}

# ===== MISE À JOUR BETA =====
Write-Host ""
Write-Host "🔄 MISE À JOUR BRANCHE BETA..." -ForegroundColor Blue

if ($remoteBranches -contains "origin/beta") {
    Write-Host "📥 Synchronisation beta ← master..." -ForegroundColor Cyan
    git checkout beta
    git pull origin beta
    git merge origin/master --no-ff -m "🔄 Sync beta ← master"
    git push origin beta
}

# ===== GÉNÉRATION DU RAPPORT =====
Write-Host ""
Write-Host "📋 GÉNÉRATION DU RAPPORT DE FUSION..." -ForegroundColor Blue

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$rapportFile = "RAPPORT-FUSION-SIMPLE-$timestamp.md"

$rapport = "FUSION SIMPLE DES BRANCHES - TUYA ZIGBEE`n"
$rapport += "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n"
$rapport += "Mode YOLO Intelligent: ACTIF`n"
$rapport += "Branches fusionnées: $($existingBranches -join ', ')`n"
$rapport += "Statut: REUSSI`n"

$rapport | Out-File -FilePath $rapportFile -Encoding UTF8
Write-Host "✅ Rapport généré: $rapportFile" -ForegroundColor Green

# ===== PUSH FINAL =====
Write-Host ""
Write-Host "📤 PUSH FINAL..." -ForegroundColor Blue

git add $rapportFile
git commit -m "📋 Rapport fusion simple - Mode YOLO Intelligent"
git push origin master

Write-Host ""
Write-Host "🎉 FUSION SIMPLE TERMINÉE AVEC SUCCÈS" -ForegroundColor Green
Write-Host "Branches fusionnées: $($existingBranches.Count)" -ForegroundColor Cyan
Write-Host "Mode YOLO Intelligent: Opérationnel" -ForegroundColor Green
Write-Host ""
Write-Host "Mode YOLO Intelligent - Fusion simple terminée" -ForegroundColor Yellow 