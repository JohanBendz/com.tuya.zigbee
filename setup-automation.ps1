# setup-automation.ps1
# Usage: .\setup-automation.ps1

# 1) Récupère le chemin du projet (répertoire courant)
$repoPath = (Get-Location).Path
Write-Host "📁 Répertoire du dépôt : $repoPath"

# 2) Crée le dossier scripts/ s’il n’existe pas
$scriptDir = Join-Path $repoPath "scripts"
if (-not (Test-Path $scriptDir)) {
  Write-Host "📂 Création du dossier 'scripts/'"
  New-Item -Path $scriptDir -ItemType Directory | Out-Null
}

# 3) Génère update-manifest.js
$manifestJs = @'
// scripts/update-manifest.js
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const composePath = join(process.cwd(), ".homeycompose", "app.json");
  const outputPath  = join(process.cwd(), "app.json");
  const content = JSON.parse(readFileSync(composePath, "utf-8"));
  const minimal = {
    id:            content.id,
    version:       content.version,
    compatibility: content.compatibility,
    platforms:     content.platforms,
    sdk:           content.sdk,
    name:          content.name,
    description:   content.description,
    tags:          content.tags
  };
  writeFileSync(outputPath, JSON.stringify(minimal, null, 2) + "\n", "utf-8");
  console.log(`✅ app.json mis à jour (version ${minimal.version})`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
'@

$manifestJsPath = Join-Path $scriptDir "update-manifest.js"
Write-Host "📝 Écriture de $manifestJsPath"
$manifestJs | Out-File -FilePath $manifestJsPath -Encoding UTF8

# 4) Met à jour package.json
$pkgPath = Join-Path $repoPath "package.json"
Write-Host "🔧 Mise à jour de package.json"
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
if (-not $pkg.scripts) { $pkg.scripts = @{} }
$pkg.scripts."update-manifest" = "node scripts/update-manifest.js"
$pkg | ConvertTo-Json -Depth 10 | Set-Content $pkgPath

# 5) Crée .github/workflows et y ajoute ci.yml
$workflowsDir = Join-Path $repoPath ".github\workflows"
if (-not (Test-Path $workflowsDir)) {
  Write-Host "📂 Création du dossier '.github/workflows/'"
  New-Item -Path $workflowsDir -ItemType Directory | Out-Null
}

$ciYaml = @'
name: CI & Manifest Sync

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  sync-manifest:
    name: Mettre à jour app.json
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: true
          fetch-depth: 0

      - name: Setup Node.js 18
        uses: actions/setup-node@v4
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Mettre à jour le manifeste
        run: npm run update-manifest

      - name: Commit & Créer PR si modifié
        uses: peter-evans/create-pull-request@v5
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          commit-message: "chore: sync app.json from .homeycompose"
          branch: sync/app-json
          title: "[Automatique] Synchronisation de app.json"
          body: |
            Ce PR met à jour `app.json` à partir de `.homeycompose/app.json`.

  lint-test:
    name: Lint & Tests
    runs-on: ubuntu-latest
    needs: sync-manifest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
