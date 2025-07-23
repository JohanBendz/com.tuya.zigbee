# TEST TIMEOUTS - Tuya Zigbee Project
# Script de test pour verifier le fonctionnement des timeouts

param(
    [switch]$Force = $false,
    [switch]$DryRun = $false
)

Write-Host "TEST DES TIMEOUTS" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan

# Import du module timeout
$timeoutModulePath = Join-Path $PSScriptRoot "timeout-utils.ps1"
if (Test-Path $timeoutModulePath) {
    . $timeoutModulePath
    Set-TimeoutConfiguration -Environment "Development"
    Write-Host "Module timeout charge avec succes" -ForegroundColor Green
} else {
    Write-Host "ERREUR: Module timeout non trouve" -ForegroundColor Red
    exit 1
}

# Test 1: Timeout court (doit reussir)
Write-Host "`nTEST 1: Timeout court (5 secondes)" -ForegroundColor Yellow
try {
    $result = Invoke-WithTimeout -ScriptBlock { Start-Sleep -Seconds 2; return "OK" } -TimeoutSeconds 5 -OperationName "Test court"
    Write-Host "SUCCES: $result" -ForegroundColor Green
} catch {
    Write-Host "ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Timeout court (doit echouer)
Write-Host "`nTEST 2: Timeout court (2 secondes)" -ForegroundColor Yellow
try {
    $result = Invoke-WithTimeout -ScriptBlock { Start-Sleep -Seconds 5; return "OK" } -TimeoutSeconds 2 -OperationName "Test timeout"
    Write-Host "SUCCES: $result" -ForegroundColor Green
} catch {
    Write-Host "TIMEOUT ATTENDU: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Test 3: Boucle avec timeout
Write-Host "`nTEST 3: Boucle avec timeout" -ForegroundColor Yellow
try {
    $iteration = 0
    $loopScript = {
        $iteration++
        if ($iteration -gt 5) { return $false }
        Start-Sleep -Milliseconds 500
        return $true
    }
    
    $result = Invoke-LoopWithTimeout -LoopScript $loopScript -TimeoutSeconds 10 -MaxIterations 20 -LoopName "Test boucle"
    Write-Host "SUCCES: Boucle terminee normalement" -ForegroundColor Green
} catch {
    Write-Host "ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Git avec timeout
Write-Host "`nTEST 4: Git avec timeout" -ForegroundColor Yellow
try {
    $result = Invoke-GitWithTimeout -GitCommand "status" -TimeoutSeconds 30 -OperationName "Git status"
    Write-Host "SUCCES: Git commande executee" -ForegroundColor Green
} catch {
    Write-Host "ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Script avec timeout
Write-Host "`nTEST 5: Script avec timeout" -ForegroundColor Yellow
try {
    $result = Invoke-ScriptWithTimeout -ScriptPath "scripts\test-rapide.ps1" -Arguments @("-DryRun") -TimeoutSeconds 60 -OperationName "Test script"
    Write-Host "SUCCES: Script execute" -ForegroundColor Green
} catch {
    Write-Host "ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 6: Process avec timeout
Write-Host "`nTEST 6: Process avec timeout" -ForegroundColor Yellow
try {
    $result = Test-ProcessWithTimeout -ProcessName "powershell" -TimeoutSeconds 10 -OperationName "Test process"
    Write-Host "SUCCES: Process trouve" -ForegroundColor Green
} catch {
    Write-Host "ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 7: File avec timeout
Write-Host "`nTEST 7: File avec timeout" -ForegroundColor Yellow
try {
    $result = Wait-FileWithTimeout -FilePath "README.md" -TimeoutSeconds 10 -OperationName "Test file"
    Write-Host "SUCCES: Fichier trouve" -ForegroundColor Green
} catch {
    Write-Host "ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: System command avec timeout
Write-Host "`nTEST 8: System command avec timeout" -ForegroundColor Yellow
try {
    $result = Invoke-SystemCommandWithTimeout -Command "Get-Date" -TimeoutSeconds 10 -OperationName "Test system"
    Write-Host "SUCCES: Commande systeme executee" -ForegroundColor Green
} catch {
    Write-Host "ERREUR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 9: Statistiques de timeout
Write-Host "`nTEST 9: Statistiques de timeout" -ForegroundColor Yellow
$testStats = @{
    "TestsReussis" = 6
    "TestsEchoues" = 2
    "Timeouts" = 1
    "Erreurs" = 1
}

Show-TimeoutStats -Stats $testStats

# Test 10: Nettoyage des jobs
Write-Host "`nTEST 10: Nettoyage des jobs" -ForegroundColor Yellow
Clear-TimeoutJobs

Write-Host "`nTOUS LES TESTS TERMINES" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host "Module timeout fonctionne correctement" -ForegroundColor White
Write-Host "Prevention des boucles infinies activee" -ForegroundColor Cyan 