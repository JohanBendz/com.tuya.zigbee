# TIMEOUT UTILS - Tuya Zigbee Project
# Module utilitaire pour gerer les timeouts et eviter les boucles infinies

# Configuration des timeouts par defaut
$script:DefaultTimeouts = @{
    "Short" = 30      # 30 secondes pour les operations rapides
    "Medium" = 120    # 2 minutes pour les operations moyennes
    "Long" = 300      # 5 minutes pour les operations longues
    "VeryLong" = 600  # 10 minutes pour les operations tres longues
    "Infinite" = 0    # Pas de timeout (a utiliser avec precaution)
}

# Fonction pour executer une commande avec timeout
function Invoke-WithTimeout {
    param(
        [scriptblock]$ScriptBlock,
        [int]$TimeoutSeconds = 120,
        [string]$OperationName = "Operation",
        [switch]$ContinueOnTimeout = $false
    )
    
    Write-Host "Debut: $OperationName (timeout: $TimeoutSeconds secondes)" -ForegroundColor Cyan
    
    $job = Start-Job -ScriptBlock $ScriptBlock
    
    try {
        $result = Wait-Job -Job $job -Timeout $TimeoutSeconds
        
        if ($result) {
            $output = Receive-Job -Job $job
            Remove-Job -Job $job
            Write-Host "OK $OperationName termine avec succes" -ForegroundColor Green
            return $output
        } else {
            Write-Host "TIMEOUT: $OperationName a depasse $TimeoutSeconds secondes" -ForegroundColor Red
            Stop-Job -Job $job
            Remove-Job -Job $job
            
            if ($ContinueOnTimeout) {
                Write-Host "Continuation malgre le timeout" -ForegroundColor Yellow
                return $null
            } else {
                throw "Timeout atteint pour $OperationName"
            }
        }
    } catch {
        Write-Host "ERREUR dans $OperationName : $($_.Exception.Message)" -ForegroundColor Red
        if ($job) {
            Stop-Job -Job $job -ErrorAction SilentlyContinue
            Remove-Job -Job $job -ErrorAction SilentlyContinue
        }
        throw
    }
}

# Fonction pour executer une boucle avec timeout
function Invoke-LoopWithTimeout {
    param(
        [scriptblock]$LoopScript,
        [int]$TimeoutSeconds = 60,
        [int]$MaxIterations = 100,
        [string]$LoopName = "Boucle"
    )
    
    Write-Host "Debut: $LoopName (max: $MaxIterations iterations, timeout: $TimeoutSeconds secondes)" -ForegroundColor Cyan
    
    $startTime = Get-Date
    $iteration = 0
    
    while ($iteration -lt $MaxIterations) {
        $iteration++
        $elapsedTime = (Get-Date) - $startTime
        
        if ($elapsedTime.TotalSeconds -gt $TimeoutSeconds) {
            Write-Host "TIMEOUT: $LoopName a depasse $TimeoutSeconds secondes apres $iteration iterations" -ForegroundColor Red
            return $false
        }
        
        try {
            $result = & $LoopScript
            if ($result -eq $false) {
                Write-Host "OK $LoopName termine normalement apres $iteration iterations" -ForegroundColor Green
                return $true
            }
        } catch {
            Write-Host "ERREUR dans $LoopName (iteration $iteration): $($_.Exception.Message)" -ForegroundColor Red
            return $false
        }
        
        # Petite pause pour eviter de surcharger le CPU
        Start-Sleep -Milliseconds 100
    }
    
    Write-Host "MAX ITERATIONS: $LoopName a atteint $MaxIterations iterations" -ForegroundColor Yellow
    return $false
}

# Fonction pour executer une commande Git avec timeout
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

# Fonction pour executer npm avec timeout
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

# Fonction pour executer un script avec timeout
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

# Fonction pour verifier l'etat d'un processus avec timeout
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

# Fonction pour executer une commande systeme avec timeout
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
    Write-Host "Nettoyage des jobs en cours..." -ForegroundColor Yellow
    
    $jobs = Get-Job -ErrorAction SilentlyContinue
    if ($jobs) {
        foreach ($job in $jobs) {
            Write-Host "Arret du job: $($job.Name)" -ForegroundColor Yellow
            Stop-Job -Job $job -ErrorAction SilentlyContinue
            Remove-Job -Job $job -ErrorAction SilentlyContinue
        }
    }
    
    Write-Host "Nettoyage termine" -ForegroundColor Green
}

# Fonction pour afficher les statistiques de timeout
function Show-TimeoutStats {
    param(
        [hashtable]$Stats
    )
    
    Write-Host "STATISTIQUES TIMEOUT" -ForegroundColor Cyan
    Write-Host "====================" -ForegroundColor Cyan
    
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
            # Configuration par defaut (Development)
        }
    }
    
    Write-Host "Configuration timeouts pour $Environment" -ForegroundColor Green
} 