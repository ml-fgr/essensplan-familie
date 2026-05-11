#!/usr/bin/env bash
# setup.sh — Einmalig auf dem Server ausführen nach dem ersten Upload / nach Updates
# Liest APP_DIR und andere Einstellungen aus .env.local und richtet alles ein.

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
PM2_APP_NAME=$(get_env PM2_APP_NAME)
SERVICE_NAME=$(get_env SERVICE_NAME)
DOMAIN=$(get_env DOMAIN)

if [ -z "$APP_DIR" ]; then
  echo "FEHLER: APP_DIR ist nicht in .env.local gesetzt."
  echo "Beispiel: APP_DIR=/var/customers/webs/FGR053/essensplan.loecke.eu"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Essensplaner Setup"
echo "  App-Verzeichnis: $APP_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── npm install + build ────────────────────────────────────────────────────
echo "▶ npm install..."
npm install --production=false

# ── Datenbank initialisieren (muss vor dem Build passieren) ───────────────
if [ ! -f "essensplan.db" ]; then
  echo "▶ Datenbank initialisieren..."
  npx tsx scripts/init-db.ts || echo "⚠ DB-Init übersprungen (ggf. manuell ausführen)"
fi

echo "▶ npm run build..."
npm run build

# ── systemd-Service einrichten ─────────────────────────────────────────────
if [ -n "$SERVICE_NAME" ] && command -v systemctl &>/dev/null; then
  SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
  NODE_BIN=$(which node)

  echo "▶ systemd-Service schreiben: $SERVICE_FILE"
  cat > "$SERVICE_FILE" <<UNIT
[Unit]
Description=Essensplaner Familie
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
ExecStart=${NODE_BIN} node_modules/.bin/next start -p 3000
Restart=always
RestartSec=5
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
  echo "  oder starte manuell mit: npm start"
fi

# ── Apache-Config ausgeben ─────────────────────────────────────────────────
DOMAIN_HINT="${DOMAIN:-deine-domain.de}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Apache VirtualHost (falls noch nicht eingerichtet)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat <<APACHE

<VirtualHost *:80>
    ServerName ${DOMAIN_HINT}
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/
</VirtualHost>

APACHE
echo "Falls du Let's Encrypt nutzt:"
echo "  certbot --apache -d ${DOMAIN_HINT}"
echo ""
echo "✓ Setup abgeschlossen."
