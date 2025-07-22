Write-Host "🛠️ MEGA RESTORE for com.tuya.zigbee"
# Root of the repository (parent of the script directory)
$projectPath = Resolve-Path (Join-Path $PSScriptRoot "..")
$restoreList = @(
    ".env.example", ".gitignore", "README.md", "deploy.ps1", "package.json",
    "dashboard/dashboard.html", "drivers/TS0001/driver.compose.json", "drivers/TS0001/icon.svg",
    "test/test-driver.ts", "tools/parse_z2m_to_homey.py", "assets/icon.svg",
    ".github/workflows/integrity-monitor.yml", ".github/workflows/monthly-backup.yml",
    ".github/workflows/bench-ia.yml", ".github/workflows/sync-rebuild.yml"
)
$backupZip = Join-Path $projectPath "backup-latest.zip"
foreach ($file in $restoreList) {
    $fullPath = Join-Path $projectPath $file
    $dirPath = Split-Path $fullPath -Parent
    if (!(Test-Path $dirPath)) {
        New-Item -Path $dirPath -ItemType Directory -Force | Out-Null
    }
    if (!(Test-Path $fullPath)) {
        if (Test-Path $backupZip) {
            Write-Host "⏳ Attempting to extract $file from backup ZIP..."
            Add-Type -AssemblyName System.IO.Compression.FileSystem
            [System.IO.Compression.ZipFile]::ExtractToDirectory($backupZip, $projectPath, $true)
        }
        if (!(Test-Path $fullPath)) {
            New-Item -Path $fullPath -ItemType File -Force | Out-Null
            Add-Content -Path $fullPath -Value "// $file — auto-restored by mega_restore.ps1"
            Write-Host "⚠️ $file recreated as template."
        } else {
            Write-Host "✅ Restored $file from backup ZIP."
        }
    } else {
        Write-Host "✔️ Exists: $file"
    }
}
$missing = @()
foreach ($file in $restoreList) {
    if (!(Test-Path (Join-Path $projectPath $file))) {
        $missing += $file
    }
}
if ($missing.Count -eq 0) {
    Write-Host "🎉 FULL RESTORE: All critical files present!"
} else {
    Write-Host "❌ The following files could not be restored:"
    $missing | ForEach-Object { Write-Host " - $_" }
    Write-Host "Check your backup ZIP or GitHub repo for manual recovery."
}
Write-Host "🛡️ MEGA RESTORE finished."
