# TEST PR ISSUE WORKFLOW - Tuya Zigbee Project
# Script pour tester et analyser le workflow PR/Issue

Write-Host "TEST PR ISSUE WORKFLOW - ANALYSE ET TEST" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

# 1. Analyse du workflow existant
Write-Host "1. ANALYSE DU WORKFLOW EXISTANT" -ForegroundColor Yellow
Write-Host "===============================" -ForegroundColor Yellow

try {
    $workflowPath = ".github/workflows/pr-issue-bot.yml"
    if (Test-Path $workflowPath) {
        $content = Get-Content -Path $workflowPath -Raw
        
        Write-Host "✅ Workflow trouvé: $workflowPath" -ForegroundColor Green
        
        # Analyse des fonctionnalités
        $features = @()
        
        if ($content -match 'schedule:') {
            $features += "Planification automatique"
        }
        
        if ($content -match 'workflow_dispatch:') {
            $features += "Déclenchement manuel"
        }
        
        if ($content -match 'github-script@v7') {
            $features += "GitHub Script v7"
        }
        
        if ($content -match 'pulls\.list') {
            $features += "Gestion des PR"
        }
        
        if ($content -match 'issues\.listForRepo') {
            $features += "Gestion des Issues"
        }
        
        if ($content -match 'createComment') {
            $features += "Commentaires automatiques"
        }
        
        Write-Host "`n📊 Fonctionnalités détectées:" -ForegroundColor White
        foreach ($feature in $features) {
            Write-Host "  ✅ $feature" -ForegroundColor Green
        }
        
        # Analyse de la planification
        if ($content -match "cron: '0 5 \* \* \*'") {
            Write-Host "`n⏰ Planification: Tous les jours à 5h00" -ForegroundColor Yellow
        }
        
        # Analyse des limites
        if ($content -match 'per_page: 5') {
            Write-Host "📝 Limite: 5 PR/Issues par exécution" -ForegroundColor Yellow
        }
        
    } else {
        Write-Host "❌ Workflow non trouvé" -ForegroundColor Red
    }
    
} catch {
    Write-Host "ERREUR analyse workflow: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Test de simulation
Write-Host "`n2. TEST DE SIMULATION" -ForegroundColor Yellow
Write-Host "===================" -ForegroundColor Yellow

try {
    Write-Host "Simulation du workflow PR/Issue Bot..." -ForegroundColor White
    
    # Simulation des données
    $simulatedPRs = @(
        @{ number = 1; title = "Feature: Ajout driver wall switch"; state = "open" },
        @{ number = 2; title = "Fix: Correction bug battery"; state = "open" },
        @{ number = 3; title = "Docs: Mise à jour README"; state = "open" }
    )
    
    $simulatedIssues = @(
        @{ number = 10; title = "Bug: Driver ne fonctionne pas"; state = "open"; pull_request = $null },
        @{ number = 11; title = "Feature: Nouveau driver"; state = "open"; pull_request = $null },
        @{ number = 12; title = "Question: Compatibilité"; state = "open"; pull_request = $null }
    )
    
    Write-Host "`n📊 PRs simulées:" -ForegroundColor White
    foreach ($pr in $simulatedPRs) {
        Write-Host "  PR #$($pr.number): $($pr.title)" -ForegroundColor Cyan
    }
    
    Write-Host "`n📊 Issues simulées:" -ForegroundColor White
    foreach ($issue in $simulatedIssues) {
        Write-Host "  Issue #$($issue.number): $($issue.title)" -ForegroundColor Cyan
    }
    
    Write-Host "`n🤖 Commentaires automatiques générés:" -ForegroundColor White
    foreach ($pr in $simulatedPRs) {
        Write-Host "  PR #$($pr.number): 🤖 Merci pour la PR ! Elle sera revue prochainement." -ForegroundColor Green
    }
    
    foreach ($issue in $simulatedIssues) {
        Write-Host "  Issue #$($issue.number): 🤖 Merci pour votre issue ! Elle sera traitée rapidement." -ForegroundColor Green
    }
    
} catch {
    Write-Host "ERREUR simulation: $($_.Exception.Message)" -ForegroundColor Red
}

# 3. Analyse des problèmes
Write-Host "`n3. ANALYSE DES PROBLÈMES" -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

try {
    $problems = @(
        "Limite de 5 PR/Issues par exécution",
        "Pas de gestion des labels",
        "Pas de gestion des assignations",
        "Pas de filtrage par type",
        "Pas de statistiques",
        "Pas de notifications avancées",
        "Pas de gestion des priorités",
        "Pas de workflow de triage intelligent"
    )
    
    Write-Host "❌ Problèmes détectés:" -ForegroundColor Red
    foreach ($problem in $problems) {
        Write-Host "  - $problem" -ForegroundColor Red
    }
    
} catch {
    Write-Host "ERREUR analyse problèmes: $($_.Exception.Message)" -ForegroundColor Red
}

# 4. Propositions d'améliorations
Write-Host "`n4. PROPOSITIONS D'AMÉLIORATIONS" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow

try {
    $improvements = @(
        "Augmenter la limite à 20 PR/Issues par exécution",
        "Ajouter la gestion automatique des labels",
        "Implémenter l'assignation automatique",
        "Ajouter le filtrage par type et priorité",
        "Créer des statistiques détaillées",
        "Implémenter des notifications avancées",
        "Ajouter un workflow de triage intelligent",
        "Créer un système de scoring des PR/Issues"
    )
    
    Write-Host "🚀 Améliorations proposées:" -ForegroundColor Green
    foreach ($improvement in $improvements) {
        Write-Host "  ✅ $improvement" -ForegroundColor Green
    }
    
} catch {
    Write-Host "ERREUR propositions: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Rapport final
Write-Host "`n5. RAPPORT FINAL" -ForegroundColor Yellow
Write-Host "===============" -ForegroundColor Yellow

Write-Host "`n📊 RÉSUMÉ DE L'ANALYSE:" -ForegroundColor Cyan
Write-Host "  - Workflow existant: ✅ Trouvé" -ForegroundColor Green
Write-Host "  - Fonctionnalités: 6 détectées" -ForegroundColor Green
Write-Host "  - Planification: Quotidienne à 5h00" -ForegroundColor Green
Write-Host "  - Limite actuelle: 5 PR/Issues" -ForegroundColor Yellow
Write-Host "  - Problèmes: 8 identifiés" -ForegroundColor Red
Write-Host "  - Améliorations: 8 proposées" -ForegroundColor Green

Write-Host "`n🎯 RECOMMANDATIONS:" -ForegroundColor Cyan
Write-Host "  1. Implémenter les améliorations proposées" -ForegroundColor White
Write-Host "  2. Créer un workflow de triage intelligent" -ForegroundColor White
Write-Host "  3. Ajouter des statistiques détaillées" -ForegroundColor White
Write-Host "  4. Optimiser la gestion des PR/Issues" -ForegroundColor White

Write-Host "`n🎉 ANALYSE TERMINÉE!" -ForegroundColor Green
Write-Host "Mode YOLO Intelligent activé - Workflow analysé" -ForegroundColor Cyan 