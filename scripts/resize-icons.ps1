param([int]$icon=64,[int]$large=500)
Get-ChildItem drivers -Recurse -Filter *.png | ForEach-Object {
  $d = $_.DirectoryName
  $iconPath  = Join-Path $d "assets/icon.png"
  $largePath = Join-Path $d "assets/large.png"
  $null = New-Item -ItemType Directory -Path (Split-Path $iconPath) -Force
  magick $_.FullName -resize "${icon}x${icon}!" $iconPath
  magick $_.FullName -resize "${large}x${large}!" $largePath
}
