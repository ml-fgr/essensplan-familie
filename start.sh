#!/bin/bash

# Essensplan-Familie — Lokaler Entwicklungsserver
PROJECTDIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECTDIR"

# .env.local anlegen falls noch nicht vorhanden
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo "✓ .env.local aus .env.local.example erstellt — bitte Werte eintragen!"
fi

# Datenbank initialisieren falls noch nicht vorhanden
if [ ! -f essensplan.db ]; then
  npx tsx scripts/init-db.ts
  echo "✓ Datenbank initialisiert"
fi

echo ""
echo "▶ Starte Entwicklungsserver auf http://localhost:3000"
echo "  Strg+C zum Beenden"
echo ""
npm run dev
