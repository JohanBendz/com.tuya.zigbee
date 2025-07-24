param(
  [string]\ = \"templates\driver.compose.json\"
)
Get-ChildItem drivers -Directory | ForEach-Object {
  if (-not (Test-Path \"$_\driver.compose.json\")) {
    Copy-Item \ \"$_\driver.compose.json\"
  }
}
