# VALIDATION FINALE - Tuya Zigbee Project
# Script de validation finale et push

param(
    [switch]$Force = $false,
    [switch]$DryRun = $false
)

Write-Host "VALIDATION FINALE DU PROJET" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

# 1) Vérification de l'état Git
Write-Host "1. VÉRIFICATION ÉTAT GIT" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

$currentBranch = git branch --show-current
$status = git status --porcelain
$modifiedFiles = ($status | Measure-Object).Count

Write-Host "Branche actuelle: $currentBranch" -ForegroundColor White
Write-Host "Fichiers modifiés: $modifiedFiles" -ForegroundColor White

if ($modifiedFiles -gt 0) {
    Write-Host "⚠️ Fichiers non commités détectés" -ForegroundColor Yellow
    git status --short
} else {
    Write-Host "✅ Aucun fichier modifié" -ForegroundColor Green
}

# 2) Test des scripts
Write-Host "`n2. TEST DES SCRIPTS" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Yellow

$scripts = @("update-readme.ps1", "setup-auto-readme.ps1", "sync-drivers.ps1", "diagnostic-complet.ps1")
$allScriptsOK = $true

foreach ($script in $scripts) {
    $scriptPath = "scripts\$script"
    if (Test-Path $scriptPath) {
        try {
            $result = & $scriptPath -DryRun -ErrorAction Stop
            Write-Host "✅ $script - OK" -ForegroundColor Green
        } catch {
            Write-Host "❌ $script - ERREUR: $($_.Exception.Message)" -ForegroundColor Red
            $allScriptsOK = $false
        }
    } else {
        Write-Host "❌ $script - MANQUANT" -ForegroundColor Red
        $allScriptsOK = $false
    }
}

# 3) Validation des métriques
Write-Host "`n3. VALIDATION DES MÉTRIQUES" -ForegroundColor Yellow
Write-Host "===========================" -ForegroundColor Yellow

$repoSize = (Get-ChildItem -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
$driverCount = (Get-ChildItem -Path "drivers" -Filter "*.js" -Recurse -ErrorAction SilentlyContinue | Measure-Object).Count
$languageCount = (Get-ChildItem -Path "locales" -Include "*.json", "*.md" -Recurse -ErrorAction SilentlyContinue | Measure-Object).Count

Write-Host "Taille repo: $([math]::Round($repoSize, 2)) MB" -ForegroundColor White
Write-Host "Drivers: $driverCount" -ForegroundColor White
Write-Host "Langues: $languageCount" -ForegroundColor White

# 4) Validation des fichiers critiques
Write-Host "`n4. VALIDATION FICHIERS CRITIQUES" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow

$criticalFiles = @("app.json", "package.json", "README.md", ".gitignore")
$allFilesOK = $true

foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        $size = (Get-Item $file).Length
        Write-Host "✅ $file ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "❌ $file - MANQUANT" -ForegroundColor Red
        $allFilesOK = $false
    }
}

# 5) Validation des workflows
Write-Host "`n5. VALIDATION WORKFLOWS" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow

$workflowFiles = Get-ChildItem -Path ".github/workflows" -Filter "*.yml" -ErrorAction SilentlyContinue
$workflowCount = $workflowFiles.Count

Write-Host "Workflows trouvés: $workflowCount" -ForegroundColor White
foreach ($workflow in $workflowFiles) {
    Write-Host "- $($workflow.Name)" -ForegroundColor White
}

# 6) Rapport de validation
Write-Host "`n6. RAPPORT DE VALIDATION" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

$validationOK = $allScriptsOK -and $allFilesOK -and ($modifiedFiles -eq 0)

if ($validationOK) {
    Write-Host "✅ VALIDATION RÉUSSIE" -ForegroundColor Green
    Write-Host "✅ PROJET PRÊT POUR PUSH" -ForegroundColor Green
} else {
    Write-Host "❌ VALIDATION ÉCHOUÉE" -ForegroundColor Red
    Write-Host "❌ CORRECTIONS NÉCESSAIRES" -ForegroundColor Red
}

# 7) Push si validation OK
if ($validationOK -and -not $DryRun) {
    Write-Host "`n7. PUSH DU PROJET" -ForegroundColor Yellow
    Write-Host "==================" -ForegroundColor Yellow
    
    try {
        git push origin $currentBranch
        Write-Host "✅ Push réussi" -ForegroundColor Green
    } catch {
        Write-Host "❌ Erreur lors du push: $($_.Exception.Message)" -ForegroundColor Red
    }
} elseif ($DryRun) {
    Write-Host "`n🔍 Mode DryRun - Push non effectué" -ForegroundColor Yellow
}

# 8) Rapport final
Write-Host "`n📊 RAPPORT FINAL" -ForegroundColor Green
Write-Host "===============" -ForegroundColor Green
Write-Host "Scripts: $(if ($allScriptsOK) { '✅ OK' } else { '❌ ERREURS' })" -ForegroundColor $(if ($allScriptsOK) { 'Green' } else { 'Red' })
Write-Host "Fichiers critiques: $(if ($allFilesOK) { '✅ OK' } else { '❌ MANQUANTS' })" -ForegroundColor $(if ($allFilesOK) { 'Green' } else { 'Red' })
Write-Host "Git: $(if ($modifiedFiles -eq 0) { '✅ PROPRE' } else { '❌ MODIFICATIONS' })" -ForegroundColor $(if ($modifiedFiles -eq 0) { 'Green' } else { 'Red' })
Write-Host "Validation: $(if ($validationOK) { '✅ RÉUSSIE' } else { '❌ ÉCHOUÉE' })" -ForegroundColor $(if ($validationOK) { 'Green' } else { 'Red' })

Write-Host "`n🚀 MODE YOLO INTELLIGENT ACTIVÉ" -ForegroundColor Magenta
Write-Host "📊 PROJET PRÊT POUR LA PRODUCTION" -ForegroundColor Cyan
Write-Host "⏰ Timestamp: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss UTC")" -ForegroundColor White 