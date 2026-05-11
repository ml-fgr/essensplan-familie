#!/usr/bin/env bash
# setup.sh — Einmalig auf dem Server ausführen bei Erstinstallation.
# Liest alle Einstellungen aus .env.local.

set -e

# ── .env.local prüfen ──────────────────────────────────────────────────────
if [ ! -f ".env.local" ]; then
  echo "FEHLER: .env.local nicht gefunden."
  echo "Kopiere .env.local.example zu .env.local und trage deine Werte ein."
  exit 1
fi

# ── Werte auslesen ─────────────────────────────────────────────────────────
get_env() { grep "^${1}=" .env.local | cut -d'=' -f2- | tr -d '"' | tr -d "'"; }

APP_DIR=$(get_env APP_DIR)
DB_PATH=$(get_env DB_PATH)
PORT=$(get_env PORT)
PM2_APP_NAME=$(get_env PM2_APP_NAME)
SERVICE_NAME=$(get_env SERVICE_NAME)
DOMAIN=$(get_env DOMAIN)

PORT="${PORT:-3000}"

if [ -z "$APP_DIR" ]; then
  echo "FEHLER: APP_DIR ist nicht in .env.local gesetzt."
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Essensplaner Setup"
echo "  App-Verzeichnis : $APP_DIR"
echo "  Port            : $PORT"
echo "  Datenbank       : ${DB_PATH:-$APP_DIR/essensplan.db (Fallback)}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── DB-Verzeichnis anlegen falls DB_PATH gesetzt ───────────────────────────
if [ -n "$DB_PATH" ]; then
  DB_DIR=$(dirname "$DB_PATH")
  mkdir -p "$DB_DIR"
  echo "✓ Datenbank-Verzeichnis: $DB_DIR"
fi

# ── npm install ────────────────────────────────────────────────────────────
echo "▶ npm install..."
npm install --production=false

# ── Datenbank initialisieren (muss vor dem Build passieren) ───────────────
ACTUAL_DB="${DB_PATH:-$APP_DIR/essensplan.db}"
if [ ! -f "$ACTUAL_DB" ]; then
  echo "▶ Datenbank initialisieren: $ACTUAL_DB"
  npx tsx scripts/init-db.ts || echo "⚠ DB-Init übersprungen (ggf. manuell ausführen)"
else
  echo "✓ Datenbank vorhanden: $ACTUAL_DB"
fi

# ── Build ──────────────────────────────────────────────────────────────────
echo "▶ npm run build..."
npm run build

# ── systemd-Service einrichten ─────────────────────────────────────────────
if [ -n "$SERVICE_NAME" ] && command -v systemctl &>/dev/null; then
  SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
  NODE_BIN=$(which node)

  echo "▶ systemd-Service schreiben: $SERVICE_FILE"
  cat > "$SERVICE_FILE" <<UNIT
[Unit]
Description=Essensplaner Familie ($SERVICE_NAME)
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
ExecStart=${NODE_BIN} node_modules/.bin/next start
Restart=always
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=${APP_DIR}/.env.local
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
UNIT

  systemctl daemon-reload
  systemctl enable "$SERVICE_NAME"
  systemctl restart "$SERVICE_NAME"
  echo "✓ Service '$SERVICE_NAME' gestartet."

# ── pm2 einrichten ─────────────────────────────────────────────────────────
elif [ -n "$PM2_APP_NAME" ] && command -v pm2 &>/dev/null; then
  echo "▶ pm2 starten: $PM2_APP_NAME"
  pm2 delete "$PM2_APP_NAME" 2>/dev/null || true
  pm2 start npm --name "$PM2_APP_NAME" -- start
  pm2 save
  echo "✓ pm2-App '$PM2_APP_NAME' gestartet."

else
  echo ""
  echo "⚠ Kein Dienst-Manager konfiguriert."
  echo "  Setze SERVICE_NAME oder PM2_APP_NAME in .env.local"
fi

# ── .htaccess anlegen falls nicht vorhanden ────────────────────────────────
if [ ! -f ".htaccess" ] && [ -n "$DOMAIN" ]; then
  echo ""
  echo "▶ .htaccess anlegen (Port $PORT)..."
  cat > .htaccess <<HTACCESS
DirectoryIndex disabled
RewriteEngine On
RewriteRule ^(.*)$ http://127.0.0.1:${PORT}/\$1 [P,L]
RequestHeader set X-Forwarded-Proto "https"
HTACCESS
  echo "✓ .htaccess erstellt für Port $PORT"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✓ Setup abgeschlossen."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
