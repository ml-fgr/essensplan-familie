#!/bin/bash

# Essensplan-Familie — Lokaler Entwicklungsserver
PROJECTDIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECTDIR"

# .env.local anlegen falls noch nicht vorhanden
if [ ! -f .env.local ]; then
  cat > .env.local <<EOF
MARKTGURU_CLIENT_KEY=WU/RH+PMGDi+gkZer3WbMelt6zcYHSTytNB7VpTia90=
MARKTGURU_API_KEY=8Kk+pmbf7TgJ9nVj2cXeA7P5zBGv8iuutVVMRfOfvNE=
SESSION_SECRET=bitte-aendern-32-zeichen-minimum!!
EOF
  echo "✓ .env.local erstellt"
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
