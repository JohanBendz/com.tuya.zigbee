# DIAGNOSTIC COMPLET - Tuya Zigbee Project
# Script de diagnostic et état d'avancement avec timeouts

param(
    [switch]$Force = $false,
    [switch]$DryRun = $false,
    [int]$TimeoutSeconds = 300
)

# Import du module timeout
$timeoutModulePath = Join-Path $PSScriptRoot "timeout-utils.ps1"
if (Test-Path $timeoutModulePath) {
    . $timeoutModulePath
    Set-TimeoutConfiguration -Environment "Development"
} else {
    Write-Host "⚠️ Module timeout non trouvé, utilisation des timeouts par défaut" -ForegroundColor Yellow
}

Write-Host "DIAGNOSTIC COMPLET DU PROJET" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

# Statistiques de timeout
$timeoutStats = @{
    "RepositoryAnalysis" = 0
    "DriverAnalysis" = 0
    "LanguageAnalysis" = 0
    "WorkflowAnalysis" = 0
    "ScriptAnalysis" = 0
    "ConfigAnalysis" = 0
}

# 1) État du repository avec timeout
Write-Host "1. ÉTAT DU REPOSITORY" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow

try {
    $repoAnalysisScript = {
        $repoSize = (Get-ChildItem -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
        $fileCount = (Get-ChildItem -Recurse -File | Measure-Object).Count
        $folderCount = (Get-ChildItem -Recurse -Directory | Measure-Object).Count
        
        return @{
            "RepoSize" = $repoSize
            "FileCount" = $fileCount
            "FolderCount" = $folderCount
        }
    }
    
    $repoData = Invoke-WithTimeout -ScriptBlock $repoAnalysisScript -TimeoutSeconds 60 -OperationName "Analyse repository"
    
    Write-Host "Taille du repo: $([math]::Round($repoData.RepoSize, 2)) MB" -ForegroundColor White
    Write-Host "Nombre de fichiers: $($repoData.FileCount)" -ForegroundColor White
    Write-Host "Nombre de dossiers: $($repoData.FolderCount)" -ForegroundColor White
    
    $timeoutStats.RepositoryAnalysis++
} catch {
    Write-Host "❌ ERREUR analyse repository: $($_.Exception.Message)" -ForegroundColor Red
    if (-not $ContinueOnTimeout) {
        throw
    }
}

# 2) Analyse des drivers avec timeout
Write-Host "`n2. ANALYSE DES DRIVERS" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow

try {
    $driverAnalysisScript = {
        $driverFiles = Get-ChildItem -Path "drivers" -Filter "*.js" -Recurse -ErrorAction SilentlyContinue
        $driverCount = $driverFiles.Count
        $deviceTypes = $driverFiles | ForEach-Object { $_.BaseName } | Sort-Object | Get-Unique
        
        return @{
            "DriverCount" = $driverCount
            "DeviceTypes" = $deviceTypes
            "DeviceTypeCount" = $deviceTypes.Count
        }
    }
    
    $driverData = Invoke-WithTimeout -ScriptBlock $driverAnalysisScript -TimeoutSeconds 45 -OperationName "Analyse drivers"
    
    Write-Host "Nombre de drivers: $($driverData.DriverCount)" -ForegroundColor White
    Write-Host "Types de devices: $($driverData.DeviceTypeCount)" -ForegroundColor White
    Write-Host "Types: $($driverData.DeviceTypes -join ', ')" -ForegroundColor White
    
    $timeoutStats.DriverAnalysis++
} catch {
    Write-Host "❌ ERREUR analyse drivers: $($_.Exception.Message)" -ForegroundColor Red
    if (-not $ContinueOnTimeout) {
        throw
    }
}

# 3) Analyse des langues avec timeout
Write-Host "`n3. ANALYSE DES LANGUES" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow

try {
    $languageAnalysisScript = {
        $languageFiles = Get-ChildItem -Path "locales" -Include "*.json", "*.md" -Recurse -ErrorAction SilentlyContinue
        $languageCount = $languageFiles.Count
        $languages = $languageFiles | ForEach-Object { $_.BaseName } | Sort-Object | Get-Unique
        
        return @{
            "LanguageCount" = $languageCount
            "Languages" = $languages
        }
    }
    
    $languageData = Invoke-WithTimeout -ScriptBlock $languageAnalysisScript -TimeoutSeconds 30 -OperationName "Analyse langues"
    
    Write-Host "Nombre de langues: $($languageData.LanguageCount)" -ForegroundColor White
    Write-Host "Langues supportées: $($languageData.Languages -join ', ')" -ForegroundColor White
    
    $timeoutStats.LanguageAnalysis++
} catch {
    Write-Host "❌ ERREUR analyse langues: $($_.Exception.Message)" -ForegroundColor Red
    if (-not $ContinueOnTimeout) {
        throw
    }
}

# 4) Analyse des workflows GitHub Actions avec timeout
Write-Host "`n4. ANALYSE DES WORKFLOWS" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow

try {
    $workflowAnalysisScript = {
        $workflowFiles = Get-ChildItem -Path ".github/workflows" -Filter "*.yml" -ErrorAction SilentlyContinue
        $workflowCount = $workflowFiles.Count
        $workflowNames = $workflowFiles | ForEach-Object { $_.Name }
        
        return @{
            "WorkflowCount" = $workflowCount
            "WorkflowNames" = $workflowNames
        }
    }
    
    $workflowData = Invoke-WithTimeout -ScriptBlock $workflowAnalysisScript -TimeoutSeconds 30 -OperationName "Analyse workflows"
    
    Write-Host "Nombre de workflows: $($workflowData.WorkflowCount)" -ForegroundColor White
    foreach ($workflow in $workflowData.WorkflowNames) {
        Write-Host "- $workflow" -ForegroundColor White
    }
    
    $timeoutStats.WorkflowAnalysis++
} catch {
    Write-Host "❌ ERREUR analyse workflows: $($_.Exception.Message)" -ForegroundColor Red
    if (-not $ContinueOnTimeout) {
        throw
    }
}

# 5) Analyse des scripts avec timeout
Write-Host "`n5. ANALYSE DES SCRIPTS" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow

try {
    $scriptAnalysisScript = {
        $scriptFiles = Get-ChildItem -Path "scripts" -Filter "*.ps1" -ErrorAction SilentlyContinue
        $scriptCount = $scriptFiles.Count
        $scriptNames = $scriptFiles | ForEach-Object { $_.Name }
        
        return @{
            "ScriptCount" = $scriptCount
            "ScriptNames" = $scriptNames
        }
    }
    
    $scriptData = Invoke-WithTimeout -ScriptBlock $scriptAnalysisScript -TimeoutSeconds 30 -OperationName "Analyse scripts"
    
    Write-Host "Nombre de scripts PowerShell: $($scriptData.ScriptCount)" -ForegroundColor White
    foreach ($script in $scriptData.ScriptNames) {
        Write-Host "- $script" -ForegroundColor White
    }
    
    $timeoutStats.ScriptAnalysis++
} catch {
    Write-Host "❌ ERREUR analyse scripts: $($_.Exception.Message)" -ForegroundColor Red
    if (-not $ContinueOnTimeout) {
        throw
    }
}

# 6) Test des scripts avec timeout
Write-Host "`n6. TEST DES SCRIPTS" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Yellow

try {
    $scriptTestScript = {
        param($scriptNames)
        $results = @{}
        
        foreach ($scriptName in $scriptNames) {
            $scriptPath = Join-Path "scripts" $scriptName
            if (Test-Path $scriptPath) {
                try {
                    $result = & $scriptPath -DryRun -ErrorAction Stop
                    $results[$scriptName] = @{ "Status" = "OK"; "Error" = $null }
                } catch {
                    $results[$scriptName] = @{ "Status" = "ERROR"; "Error" = $_.Exception.Message }
                }
            } else {
                $results[$scriptName] = @{ "Status" = "MISSING"; "Error" = "Fichier non trouvé" }
            }
        }
        
        return $results
    }
    
    $scriptResults = Invoke-WithTimeout -ScriptBlock $scriptTestScript -TimeoutSeconds 120 -OperationName "Test scripts" -ArgumentList $scriptData.ScriptNames
    
    foreach ($script in $scriptData.ScriptNames) {
        $result = $scriptResults[$script]
        switch ($result.Status) {
            "OK" { Write-Host "✅ $script - OK" -ForegroundColor Green }
            "ERROR" { Write-Host "❌ $script - ERREUR: $($result.Error)" -ForegroundColor Red }
            "MISSING" { Write-Host "❌ $script - MANQUANT" -ForegroundColor Red }
        }
    }
    
    $timeoutStats.ScriptAnalysis++
} catch {
    Write-Host "❌ ERREUR test scripts: $($_.Exception.Message)" -ForegroundColor Red
    if (-not $ContinueOnTimeout) {
        throw
    }
}

# 7) Analyse des fichiers de configuration avec timeout
Write-Host "`n7. ANALYSE DES CONFIGURATIONS" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow

try {
    $configAnalysisScript = {
        $configFiles = @("app.json", "package.json", ".gitignore", "README.md")
        $results = @{}
        
        foreach ($config in $configFiles) {
            if (Test-Path $config) {
                $size = (Get-Item $config).Length
                $results[$config] = @{ "Exists" = $true; "Size" = $size }
            } else {
                $results[$config] = @{ "Exists" = $false; "Size" = 0 }
            }
        }
        
        return $results
    }
    
    $configResults = Invoke-WithTimeout -ScriptBlock $configAnalysisScript -TimeoutSeconds 30 -OperationName "Analyse configurations"
    
    foreach ($config in @("app.json", "package.json", ".gitignore", "README.md")) {
        if ($configResults[$config].Exists) {
            $size = $configResults[$config].Size
            Write-Host "✅ $config ($size bytes)" -ForegroundColor Green
        } else {
            Write-Host "❌ $config - MANQUANT" -ForegroundColor Red
        }
    }
    
    $timeoutStats.ConfigAnalysis++
} catch {
    Write-Host "❌ ERREUR analyse configurations: $($_.Exception.Message)" -ForegroundColor Red
    if (-not $ContinueOnTimeout) {
        throw
    }
}

# 8) État Git avec timeout
Write-Host "`n8. ÉTAT GIT" -ForegroundColor Yellow
Write-Host "============" -ForegroundColor Yellow

try {
    $gitStatusScript = {
        $currentBranch = git branch --show-current
        $status = git status --porcelain
        $modifiedFiles = ($status | Measure-Object).Count
        
        return @{
            "CurrentBranch" = $currentBranch
            "ModifiedFiles" = $modifiedFiles
            "Status" = $status
        }
    }
    
    $gitData = Invoke-WithTimeout -ScriptBlock $gitStatusScript -TimeoutSeconds 30 -OperationName "État Git"
    
    Write-Host "Branche actuelle: $($gitData.CurrentBranch)" -ForegroundColor White
    Write-Host "Fichiers modifiés: $($gitData.ModifiedFiles)" -ForegroundColor White
    
    if ($gitData.ModifiedFiles -gt 0) {
        Write-Host "Fichiers non commités:" -ForegroundColor Yellow
        $gitData.Status | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
    }
    
    $timeoutStats.RepositoryAnalysis++
} catch {
    Write-Host "❌ ERREUR état Git: $($_.Exception.Message)" -ForegroundColor Red
    if (-not $ContinueOnTimeout) {
        throw
    }
}

# 9) Rapport final avec timeout
Write-Host "`n9. RAPPORT FINAL" -ForegroundColor Yellow
Write-Host "===============" -ForegroundColor Yellow

try {
    $finalReportScript = {
        param($repoData, $driverData, $languageData, $workflowData, $scriptData)
        
        $report = @"
# 📊 RAPPORT DIAGNOSTIC COMPLET - Tuya Zigbee Project

## 📈 Métriques du Repository
- **Taille**: $([math]::Round($repoData.RepoSize, 2)) MB
- **Fichiers**: $($repoData.FileCount)
- **Dossiers**: $($repoData.FolderCount)

## 📱 Drivers et Devices
- **Drivers**: $($driverData.DriverCount)
- **Types de devices**: $($driverData.DeviceTypeCount)
- **Types**: $($driverData.DeviceTypes -join ', ')

## 🌍 Support Multilingue
- **Langues**: $($languageData.LanguageCount)
- **Supportées**: $($languageData.Languages -join ', ')

## 🔄 Workflows GitHub Actions
- **Nombre**: $($workflowData.WorkflowCount)
- **Liste**: $($workflowData.WorkflowNames -join ', ')

## 📜 Scripts PowerShell
- **Nombre**: $($scriptData.ScriptCount)
- **Liste**: $($scriptData.ScriptNames -join ', ')

## 🎯 Statut du Projet
- **État**: Opérationnel
- **Mode**: YOLO Intelligent activé
- **Optimisation**: Continue

---
*Rapport généré automatiquement - Mode YOLO Intelligent*
"@
        
        return $report
    }
    
    $finalReport = Invoke-WithTimeout -ScriptBlock $finalReportScript -TimeoutSeconds 30 -OperationName "Génération rapport final" -ArgumentList $repoData, $driverData, $languageData, $workflowData, $scriptData
    
    Write-Host $finalReport -ForegroundColor White
    
    $timeoutStats.ConfigAnalysis++
} catch {
    Write-Host "❌ ERREUR rapport final: $($_.Exception.Message)" -ForegroundColor Red
    if (-not $ContinueOnTimeout) {
        throw
    }
}

# 10) Affichage des statistiques de timeout
Write-Host "`n10. STATISTIQUES TIMEOUT" -ForegroundColor Yellow
Write-Host "========================" -ForegroundColor Yellow

Show-TimeoutStats -Stats $timeoutStats

# 11) Nettoyage des jobs
Write-Host "`n11. NETTOYAGE" -ForegroundColor Yellow
Write-Host "==============" -ForegroundColor Yellow

Clear-TimeoutJobs

Write-Host "`n🎉 DIAGNOSTIC COMPLET TERMINÉ" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host "Projet Tuya Zigbee analysé avec succès!" -ForegroundColor White
Write-Host "Mode YOLO Intelligent activé - Diagnostic continu" -ForegroundColor Cyan 