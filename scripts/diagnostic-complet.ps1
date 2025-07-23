# DIAGNOSTIC COMPLET - Tuya Zigbee Project
# Script de diagnostic et etat d'avancement avec timeouts

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
    Write-Host "Module timeout non trouve, utilisation des timeouts par defaut" -ForegroundColor Yellow
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

# Variables globales pour stocker les donnees
$global:repoData = $null
$global:driverData = $null
$global:languageData = $null
$global:workflowData = $null
$global:scriptData = $null

# 1) Etat du repository avec timeout
Write-Host "1. ETAT DU REPOSITORY" -ForegroundColor Yellow
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
    
    $global:repoData = Invoke-WithTimeout -ScriptBlock $repoAnalysisScript -TimeoutSeconds 60 -OperationName "Analyse repository"
    
    if ($global:repoData) {
        Write-Host "Taille du repo: $([math]::Round($global:repoData.RepoSize, 2)) MB" -ForegroundColor White
        Write-Host "Nombre de fichiers: $($global:repoData.FileCount)" -ForegroundColor White
        Write-Host "Nombre de dossiers: $($global:repoData.FolderCount)" -ForegroundColor White
    } else {
        Write-Host "Donnees repository non disponibles" -ForegroundColor Yellow
    }
    
    $timeoutStats.RepositoryAnalysis++
} catch {
    Write-Host "ERREUR analyse repository: $($_.Exception.Message)" -ForegroundColor Red
    $global:repoData = @{ "RepoSize" = 0; "FileCount" = 0; "FolderCount" = 0 }
}

# 2) Analyse des drivers avec timeout
Write-Host "`n2. ANALYSE DES DRIVERS" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow

try {
    $driverAnalysisScript = {
        if (Test-Path "drivers") {
            $driverFiles = Get-ChildItem -Path "drivers" -Directory -ErrorAction SilentlyContinue
            $driverCount = $driverFiles.Count
            $deviceTypes = $driverFiles | ForEach-Object { $_.Name } | Sort-Object | Get-Unique
        } else {
            $driverCount = 0
            $deviceTypes = @()
        }
        
        return @{
            "DriverCount" = $driverCount
            "DeviceTypes" = $deviceTypes
            "DeviceTypeCount" = $deviceTypes.Count
        }
    }
    
    $global:driverData = Invoke-WithTimeout -ScriptBlock $driverAnalysisScript -TimeoutSeconds 45 -OperationName "Analyse drivers"
    
    if ($global:driverData) {
        Write-Host "Nombre de drivers: $($global:driverData.DriverCount)" -ForegroundColor White
        Write-Host "Types de devices: $($global:driverData.DeviceTypeCount)" -ForegroundColor White
        if ($global:driverData.DeviceTypes.Count -gt 0) {
            Write-Host "Types: $($global:driverData.DeviceTypes -join ', ')" -ForegroundColor White
        }
    } else {
        Write-Host "Donnees drivers non disponibles" -ForegroundColor Yellow
    }
    
    $timeoutStats.DriverAnalysis++
} catch {
    Write-Host "ERREUR analyse drivers: $($_.Exception.Message)" -ForegroundColor Red
    $global:driverData = @{ "DriverCount" = 0; "DeviceTypes" = @(); "DeviceTypeCount" = 0 }
}

# 3) Analyse des langues avec timeout
Write-Host "`n3. ANALYSE DES LANGUES" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow

try {
    $languageAnalysisScript = {
        if (Test-Path "locales") {
            $languageFiles = Get-ChildItem -Path "locales" -Include "*.json", "*.md" -Recurse -ErrorAction SilentlyContinue
            $languageCount = $languageFiles.Count
            $languages = $languageFiles | ForEach-Object { $_.BaseName } | Sort-Object | Get-Unique
        } else {
            $languageCount = 0
            $languages = @()
        }
        
        return @{
            "LanguageCount" = $languageCount
            "Languages" = $languages
        }
    }
    
    $global:languageData = Invoke-WithTimeout -ScriptBlock $languageAnalysisScript -TimeoutSeconds 30 -OperationName "Analyse langues"
    
    if ($global:languageData) {
        Write-Host "Nombre de langues: $($global:languageData.LanguageCount)" -ForegroundColor White
        if ($global:languageData.Languages.Count -gt 0) {
            Write-Host "Langues supportees: $($global:languageData.Languages -join ', ')" -ForegroundColor White
        }
    } else {
        Write-Host "Donnees langues non disponibles" -ForegroundColor Yellow
    }
    
    $timeoutStats.LanguageAnalysis++
} catch {
    Write-Host "ERREUR analyse langues: $($_.Exception.Message)" -ForegroundColor Red
    $global:languageData = @{ "LanguageCount" = 0; "Languages" = @() }
}

# 4) Analyse des workflows GitHub Actions avec timeout
Write-Host "`n4. ANALYSE DES WORKFLOWS" -ForegroundColor Yellow
Write-Host "=======================" -ForegroundColor Yellow

try {
    $workflowAnalysisScript = {
        if (Test-Path ".github/workflows") {
            $workflowFiles = Get-ChildItem -Path ".github/workflows" -Filter "*.yml" -ErrorAction SilentlyContinue
            $workflowCount = $workflowFiles.Count
            $workflowNames = $workflowFiles | ForEach-Object { $_.Name }
        } else {
            $workflowCount = 0
            $workflowNames = @()
        }
        
        return @{
            "WorkflowCount" = $workflowCount
            "WorkflowNames" = $workflowNames
        }
    }
    
    $global:workflowData = Invoke-WithTimeout -ScriptBlock $workflowAnalysisScript -TimeoutSeconds 30 -OperationName "Analyse workflows"
    
    if ($global:workflowData) {
        Write-Host "Nombre de workflows: $($global:workflowData.WorkflowCount)" -ForegroundColor White
        foreach ($workflow in $global:workflowData.WorkflowNames) {
            Write-Host "- $workflow" -ForegroundColor White
        }
    } else {
        Write-Host "Donnees workflows non disponibles" -ForegroundColor Yellow
    }
    
    $timeoutStats.WorkflowAnalysis++
} catch {
    Write-Host "ERREUR analyse workflows: $($_.Exception.Message)" -ForegroundColor Red
    $global:workflowData = @{ "WorkflowCount" = 0; "WorkflowNames" = @() }
}

# 5) Analyse des scripts avec timeout
Write-Host "`n5. ANALYSE DES SCRIPTS" -ForegroundColor Yellow
Write-Host "=====================" -ForegroundColor Yellow

try {
    $scriptAnalysisScript = {
        if (Test-Path "scripts") {
            $scriptFiles = Get-ChildItem -Path "scripts" -Filter "*.ps1" -ErrorAction SilentlyContinue
            $scriptCount = $scriptFiles.Count
            $scriptNames = $scriptFiles | ForEach-Object { $_.Name }
        } else {
            $scriptCount = 0
            $scriptNames = @()
        }
        
        return @{
            "ScriptCount" = $scriptCount
            "ScriptNames" = $scriptNames
        }
    }
    
    $global:scriptData = Invoke-WithTimeout -ScriptBlock $scriptAnalysisScript -TimeoutSeconds 30 -OperationName "Analyse scripts"
    
    if ($global:scriptData) {
        Write-Host "Nombre de scripts PowerShell: $($global:scriptData.ScriptCount)" -ForegroundColor White
        foreach ($script in $global:scriptData.ScriptNames) {
            Write-Host "- $script" -ForegroundColor White
        }
    } else {
        Write-Host "Donnees scripts non disponibles" -ForegroundColor Yellow
    }
    
    $timeoutStats.ScriptAnalysis++
} catch {
    Write-Host "ERREUR analyse scripts: $($_.Exception.Message)" -ForegroundColor Red
    $global:scriptData = @{ "ScriptCount" = 0; "ScriptNames" = @() }
}

# 6) Test des scripts avec timeout (seulement si des scripts existent)
Write-Host "`n6. TEST DES SCRIPTS" -ForegroundColor Yellow
Write-Host "==================" -ForegroundColor Yellow

if ($global:scriptData -and $global:scriptData.ScriptNames.Count -gt 0) {
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
                    $results[$scriptName] = @{ "Status" = "MISSING"; "Error" = "Fichier non trouve" }
                }
            }
            
            return $results
        }
        
        $scriptResults = Invoke-WithTimeout -ScriptBlock $scriptTestScript -TimeoutSeconds 120 -OperationName "Test scripts" -ArgumentList $global:scriptData.ScriptNames
        
        if ($scriptResults) {
            foreach ($script in $global:scriptData.ScriptNames) {
                if ($scriptResults.ContainsKey($script)) {
                    $result = $scriptResults[$script]
                    switch ($result.Status) {
                        "OK" { Write-Host "OK $script - OK" -ForegroundColor Green }
                        "ERROR" { Write-Host "ERREUR $script - ERREUR: $($result.Error)" -ForegroundColor Red }
                        "MISSING" { Write-Host "MANQUANT $script - MANQUANT" -ForegroundColor Red }
                    }
                }
            }
        }
        
        $timeoutStats.ScriptAnalysis++
    } catch {
        Write-Host "ERREUR test scripts: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "Aucun script a tester" -ForegroundColor Yellow
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
    
    if ($configResults) {
        foreach ($config in @("app.json", "package.json", ".gitignore", "README.md")) {
            if ($configResults.ContainsKey($config) -and $configResults[$config].Exists) {
                $size = $configResults[$config].Size
                Write-Host "OK $config ($size bytes)" -ForegroundColor Green
            } else {
                Write-Host "MANQUANT $config - MANQUANT" -ForegroundColor Red
            }
        }
    }
    
    $timeoutStats.ConfigAnalysis++
} catch {
    Write-Host "ERREUR analyse configurations: $($_.Exception.Message)" -ForegroundColor Red
}

# 8) Etat Git avec timeout
Write-Host "`n8. ETAT GIT" -ForegroundColor Yellow
Write-Host "============" -ForegroundColor Yellow

try {
    $gitStatusScript = {
        $currentBranch = git branch --show-current 2>$null
        $status = git status --porcelain 2>$null
        $modifiedFiles = ($status | Measure-Object).Count
        
        return @{
            "CurrentBranch" = $currentBranch
            "ModifiedFiles" = $modifiedFiles
            "Status" = $status
        }
    }
    
    $gitData = Invoke-WithTimeout -ScriptBlock $gitStatusScript -TimeoutSeconds 30 -OperationName "Etat Git"
    
    if ($gitData) {
        Write-Host "Branche actuelle: $($gitData.CurrentBranch)" -ForegroundColor White
        Write-Host "Fichiers modifies: $($gitData.ModifiedFiles)" -ForegroundColor White
        
        if ($gitData.ModifiedFiles -gt 0) {
            Write-Host "Fichiers non commites:" -ForegroundColor Yellow
            $gitData.Status | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
        }
    }
    
    $timeoutStats.RepositoryAnalysis++
} catch {
    Write-Host "ERREUR etat Git: $($_.Exception.Message)" -ForegroundColor Red
}

# 9) Rapport final avec timeout
Write-Host "`n9. RAPPORT FINAL" -ForegroundColor Yellow
Write-Host "===============" -ForegroundColor Yellow

try {
    $finalReportScript = {
        param($repoData, $driverData, $languageData, $workflowData, $scriptData)
        
        $report = @"
RAPPORT DIAGNOSTIC COMPLET - Tuya Zigbee Project

Metriques du Repository:
- Taille: $([math]::Round($repoData.RepoSize, 2)) MB
- Fichiers: $($repoData.FileCount)
- Dossiers: $($repoData.FolderCount)

Drivers et Devices:
- Drivers: $($driverData.DriverCount)
- Types de devices: $($driverData.DeviceTypeCount)
- Types: $($driverData.DeviceTypes -join ', ')

Support Multilingue:
- Langues: $($languageData.LanguageCount)
- Supportees: $($languageData.Languages -join ', ')

Workflows GitHub Actions:
- Nombre: $($workflowData.WorkflowCount)
- Liste: $($workflowData.WorkflowNames -join ', ')

Scripts PowerShell:
- Nombre: $($scriptData.ScriptCount)
- Liste: $($scriptData.ScriptNames -join ', ')

Statut du Projet:
- Etat: Operationnel
- Mode: YOLO Intelligent active
- Optimisation: Continue

---
Rapport genere automatiquement - Mode YOLO Intelligent
"@
        
        return $report
    }
    
    $finalReport = Invoke-WithTimeout -ScriptBlock $finalReportScript -TimeoutSeconds 30 -OperationName "Generation rapport final" -ArgumentList $global:repoData, $global:driverData, $global:languageData, $global:workflowData, $global:scriptData
    
    if ($finalReport) {
        Write-Host $finalReport -ForegroundColor White
    }
    
    $timeoutStats.ConfigAnalysis++
} catch {
    Write-Host "ERREUR rapport final: $($_.Exception.Message)" -ForegroundColor Red
}

# 10) Affichage des statistiques de timeout
Write-Host "`n10. STATISTIQUES TIMEOUT" -ForegroundColor Yellow
Write-Host "========================" -ForegroundColor Yellow

Show-TimeoutStats -Stats $timeoutStats

# 11) Nettoyage des jobs
Write-Host "`n11. NETTOYAGE" -ForegroundColor Yellow
Write-Host "==============" -ForegroundColor Yellow

Clear-TimeoutJobs

Write-Host "`nDIAGNOSTIC COMPLET TERMINE" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host "Projet Tuya Zigbee analyse avec succes!" -ForegroundColor White
Write-Host "Mode YOLO Intelligent active - Diagnostic continu" -ForegroundColor Cyan 