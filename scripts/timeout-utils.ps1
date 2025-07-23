# TIMEOUT UTILS - Tuya Zigbee Project
# Module utilitaire pour gérer les timeouts et éviter les boucles infinies

# Configuration des timeouts par défaut
$script:DefaultTimeouts = @{
    "Short" = 30      # 30 secondes pour les opérations rapides
    "Medium" = 120    # 2 minutes pour les opérations moyennes
    "Long" = 300      # 5 minutes pour les opérations longues
    "VeryLong" = 600  # 10 minutes pour les opérations très longues
    "Infinite" = 0    # Pas de timeout (à utiliser avec précaution)
}

# Fonction pour exécuter une commande avec timeout
function Invoke-WithTimeout {
    param(
        [scriptblock]$ScriptBlock,
        [int]$TimeoutSeconds = 120,
        [string]$OperationName = "Opération",
        [switch]$ContinueOnTimeout = $false
    )
    
    Write-Host "⏱️ Début: $OperationName (timeout: $TimeoutSeconds secondes)" -ForegroundColor Cyan
    
    $job = Start-Job -ScriptBlock $ScriptBlock
    
    try {
        $result = Wait-Job -Job $job -Timeout $TimeoutSeconds
        
        if ($result) {
            $output = Receive-Job -Job $job
            Remove-Job -Job $job
            Write-Host "✅ $OperationName terminé avec succès" -ForegroundColor Green
            return $output
        } else {
            Write-Host "⏰ TIMEOUT: $OperationName a dépassé $TimeoutSeconds secondes" -ForegroundColor Red
            Stop-Job -Job $job
            Remove-Job -Job $job
            
            if ($ContinueOnTimeout) {
                Write-Host "⚠️ Continuation malgré le timeout" -ForegroundColor Yellow
                return $null
            } else {
                throw "Timeout atteint pour $OperationName"
            }
        }
    } catch {
        Write-Host "❌ ERREUR dans $OperationName : $($_.Exception.Message)" -ForegroundColor Red
        if ($job) {
            Stop-Job -Job $job -ErrorAction SilentlyContinue
            Remove-Job -Job $job -ErrorAction SilentlyContinue
        }
        throw
    }
}

# Fonction pour exécuter une boucle avec timeout
function Invoke-LoopWithTimeout {
    param(
        [scriptblock]$LoopScript,
        [int]$TimeoutSeconds = 60,
        [int]$MaxIterations = 100,
        [string]$LoopName = "Boucle"
    )
    
    Write-Host "🔄 Début: $LoopName (max: $MaxIterations itérations, timeout: $TimeoutSeconds secondes)" -ForegroundColor Cyan
    
    $startTime = Get-Date
    $iteration = 0
    
    while ($iteration -lt $MaxIterations) {
        $iteration++
        $elapsedTime = (Get-Date) - $startTime
        
        if ($elapsedTime.TotalSeconds -gt $TimeoutSeconds) {
            Write-Host "⏰ TIMEOUT: $LoopName a dépassé $TimeoutSeconds secondes après $iteration itérations" -ForegroundColor Red
            return $false
        }
        
        try {
            $result = & $LoopScript
            if ($result -eq $false) {
                Write-Host "✅ $LoopName terminé normalement après $iteration itérations" -ForegroundColor Green
                return $true
            }
        } catch {
            Write-Host "❌ ERREUR dans $LoopName (itération $iteration): $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
        
        # Petite pause pour éviter de surcharger le CPU
        Start-Sleep -Milliseconds 100
    }
    
    Write-Host "🔄 MAX ITERATIONS: $LoopName a atteint $MaxIterations itérations" -ForegroundColor Yellow
    return $false
}

# Fonction pour exécuter une commande Git avec timeout
function Invoke-GitWithTimeout {
    param(
        [string]$GitCommand,
        [int]$TimeoutSeconds = 60,
        [string]$OperationName = "Git"
    )
    
    $scriptBlock = {
        param($cmd)
        & git $cmd.Split(' ')
    }
    
    return Invoke-WithTimeout -ScriptBlock $scriptBlock -TimeoutSeconds $TimeoutSeconds -OperationName $OperationName -ArgumentList $GitCommand
}

# Fonction pour exécuter npm avec timeout
function Invoke-NpmWithTimeout {
    param(
        [string]$NpmCommand,
        [int]$TimeoutSeconds = 300,
        [string]$OperationName = "NPM"
    )
    
    $scriptBlock = {
        param($cmd)
        & npm $cmd.Split(' ')
    }
    
    return Invoke-WithTimeout -ScriptBlock $scriptBlock -TimeoutSeconds $TimeoutSeconds -OperationName $OperationName -ArgumentList $NpmCommand
}

# Fonction pour exécuter un script avec timeout
function Invoke-ScriptWithTimeout {
    param(
        [string]$ScriptPath,
        [string[]]$Arguments = @(),
        [int]$TimeoutSeconds = 120,
        [string]$OperationName = "Script"
    )
    
    $scriptBlock = {
        param($path, $args)
        & $path $args
    }
    
    return Invoke-WithTimeout -ScriptBlock $scriptBlock -TimeoutSeconds $TimeoutSeconds -OperationName $OperationName -ArgumentList $ScriptPath, $Arguments
}

# Fonction pour vérifier l'état d'un processus avec timeout
function Test-ProcessWithTimeout {
    param(
        [string]$ProcessName,
        [int]$TimeoutSeconds = 30,
        [string]$OperationName = "Process"
    )
    
    $scriptBlock = {
        param($name)
        Get-Process -Name $name -ErrorAction SilentlyContinue
    }
    
    $result = Invoke-WithTimeout -ScriptBlock $scriptBlock -TimeoutSeconds $TimeoutSeconds -OperationName $OperationName -ArgumentList $ProcessName
    return $result -ne $null
}

# Fonction pour attendre un fichier avec timeout
function Wait-FileWithTimeout {
    param(
        [string]$FilePath,
        [int]$TimeoutSeconds = 60,
        [string]$OperationName = "File"
    )
    
    $scriptBlock = {
        param($path)
        while (-not (Test-Path $path)) {
            Start-Sleep -Seconds 1
        }
        return $true
    }
    
    return Invoke-WithTimeout -ScriptBlock $scriptBlock -TimeoutSeconds $TimeoutSeconds -OperationName $OperationName -ArgumentList $FilePath
}

# Fonction pour exécuter une commande système avec timeout
function Invoke-SystemCommandWithTimeout {
    param(
        [string]$Command,
        [int]$TimeoutSeconds = 60,
        [string]$OperationName = "System"
    )
    
    $scriptBlock = {
        param($cmd)
        Invoke-Expression $cmd
    }
    
    return Invoke-WithTimeout -ScriptBlock $scriptBlock -TimeoutSeconds $TimeoutSeconds -OperationName $OperationName -ArgumentList $Command
}

# Fonction pour nettoyer les jobs en cours
function Clear-TimeoutJobs {
    Write-Host "🧹 Nettoyage des jobs en cours..." -ForegroundColor Yellow
    
    $jobs = Get-Job -ErrorAction SilentlyContinue
    if ($jobs) {
        foreach ($job in $jobs) {
            Write-Host "Arrêt du job: $($job.Name)" -ForegroundColor Yellow
            Stop-Job -Job $job -ErrorAction SilentlyContinue
            Remove-Job -Job $job -ErrorAction SilentlyContinue
        }
    }
    
    Write-Host "✅ Nettoyage terminé" -ForegroundColor Green
}

# Fonction pour afficher les statistiques de timeout
function Show-TimeoutStats {
    param(
        [hashtable]$Stats
    )
    
    Write-Host "📊 STATISTIQUES TIMEOUT" -ForegroundColor Cyan
    Write-Host "=======================" -ForegroundColor Cyan
    
    foreach ($stat in $Stats.GetEnumerator()) {
        Write-Host "$($stat.Key): $($stat.Value)" -ForegroundColor White
    }
}

# Configuration automatique des timeouts selon l'environnement
function Set-TimeoutConfiguration {
    param(
        [string]$Environment = "Development"
    )
    
    switch ($Environment) {
        "Production" {
            $script:DefaultTimeouts.Short = 60
            $script:DefaultTimeouts.Medium = 300
            $script:DefaultTimeouts.Long = 600
            $script:DefaultTimeouts.VeryLong = 1200
        }
        "Testing" {
            $script:DefaultTimeouts.Short = 15
            $script:DefaultTimeouts.Medium = 60
            $script:DefaultTimeouts.Long = 120
            $script:DefaultTimeouts.VeryLong = 300
        }
        default {
            # Configuration par défaut (Development)
        }
    }
    
    Write-Host "⚙️ Configuration timeouts pour $Environment" -ForegroundColor Green
}

# Export des fonctions
Export-ModuleMember -Function @(
    'Invoke-WithTimeout',
    'Invoke-LoopWithTimeout',
    'Invoke-GitWithTimeout',
    'Invoke-NpmWithTimeout',
    'Invoke-ScriptWithTimeout',
    'Test-ProcessWithTimeout',
    'Wait-FileWithTimeout',
    'Invoke-SystemCommandWithTimeout',
    'Clear-TimeoutJobs',
    'Show-TimeoutStats',
    'Set-TimeoutConfiguration'
) 