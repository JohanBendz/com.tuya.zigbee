# Script de génération des drivers - Version basique
Write-Host "Generation automatique des drivers" -ForegroundColor Green

$driversPath = "drivers"
$appJsonPath = "app.json"

if (-not (Test-Path $driversPath)) {
    Write-Host "Dossier drivers non trouve" -ForegroundColor Red
    exit 1
}

$driverFolders = Get-ChildItem -Path $driversPath -Directory | Where-Object { 
    $_.Name -notmatch "^(history|backup|temp)" 
}

Write-Host "Trouve $($driverFolders.Count) drivers" -ForegroundColor Green

$driversList = @()

foreach ($folder in $driverFolders) {
    $driverName = $folder.Name
    
    $driverEntry = @{
        id = $driverName
        name = @{
            en = $driverName -replace "_", " " -replace "-", " "
            fr = $driverName -replace "_", " " -replace "-", " "
            de = $driverName -replace "_", " " -replace "-", " "
            es = $driverName -replace "_", " " -replace "-", " "
            it = $driverName -replace "_", " " -replace "-", " "
            nl = $driverName -replace "_", " " -replace "-", " "
        }
        description = @{
            en = "Tuya Zigbee $($driverName -replace "_", " " -replace "-", " ") device"
            fr = "Appareil Tuya Zigbee $($driverName -replace "_", " " -replace "-", " ")"
            de = "Tuya Zigbee $($driverName -replace "_", " " -replace "-", " ") Gerat"
            es = "Dispositivo Tuya Zigbee $($driverName -replace "_", " " -replace "-", " ")"
            it = "Dispositivo Tuya Zigbee $($driverName -replace "_", " " -replace "-", " ")"
            nl = "Tuya Zigbee $($driverName -replace "_", " " -replace "-", " ") apparaat"
        }
        images = @{
            small = "assets/icon.svg"
            large = "assets/icon.svg"
        }
        capabilities = @("onoff")
        capabilityOptions = @{}
        settings = @()
    }
    
    $driversList += $driverEntry
    Write-Host "  $driverName" -ForegroundColor Green
}

if (Test-Path $appJsonPath) {
    $appJsonContent = Get-Content $appJsonPath -Raw | ConvertFrom-Json
    $appJsonContent.drivers = $driversList
    $appJsonContent | ConvertTo-Json -Depth 10 | Set-Content $appJsonPath -Encoding UTF8
    Write-Host "app.json mis a jour avec $($driversList.Count) drivers" -ForegroundColor Green
} else {
    Write-Host "app.json non trouve" -ForegroundColor Red
}

Write-Host "Generation terminee avec succes" -ForegroundColor Green
Write-Host "$($driversList.Count) drivers generes" -ForegroundColor Cyan 