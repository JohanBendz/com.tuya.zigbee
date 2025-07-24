#!/usr/bin/env bash
set -e

# Installation des dépendances
npm ci

# Mise à jour du manifest
npm run update-manifest

# Validation de l'application Homey
npx homey app validate

echo "✅ Build terminé"
