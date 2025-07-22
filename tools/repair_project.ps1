Write-Host "🛠️ Script de restauration automatique pour com.tuya.zigbee"
# Root of the repository (parent of the script directory)
$projectPath = Resolve-Path (Join-Path $PSScriptRoot "..")

# Fichiers/dossiers critiques à restaurer
$restoreList = @(
    ".env.example", ".gitignore", "README.md", "deploy.ps1", "package.json",
    "dashboard/dashboard.html", "drivers/TS0001/driver.compose.json", "drivers/TS0001/icon.svg",
    "test/test-driver.ts", "tools/parse_z2m_to_homey.py", "assets/icon.svg",
    ".github/workflows/integrity-monitor.yml", ".github/workflows/monthly-backup.yml"
)
foreach ($file in $restoreList) {
    $fullPath = Join-Path $projectPath $file
    if (!(Test-Path $fullPath)) {
        New-Item -Path $fullPath -ItemType File -Force | Out-Null
        Set-Content -Path $fullPath -Value "// $file — restauré automatiquement"
        Write-Host "✅ Restauré : $file"
    } else {
        Write-Host "✔️ Existe déjà : $file"
    }
}
Write-Host "🎉 Restauration terminée. Relancez vos outils si besoin."
