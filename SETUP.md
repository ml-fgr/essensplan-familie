# Essensplan Familie — Server-Installation

## Voraussetzungen

- **Node.js 22.5 oder neuer** (empfohlen: Node.js 22 LTS oder 20 LTS mit Prisma-Alternative)
- **npm** (kommt mit Node.js)
- Apache mit `mod_proxy` und `mod_proxy_http`

Node.js-Version prüfen:
```bash
node --version
```

---

## 1. Dateien hochladen

Lade `essensplan-upload.zip` auf den Server und entpacke sie:

```bash
unzip essensplan-upload.zip -d /var/www/
cd /var/www/essensplan-familie
```

---

## 2. Konfiguration

Erstelle die Konfigurationsdatei aus dem Beispiel:

```bash
cp .env.local.example .env.local
nano .env.local
```

Ändere **SESSION_SECRET** auf einen langen zufälligen Wert:
```
SESSION_SECRET=IrgendeinLangerZufaelligerTextMit32Zeichen!!
```

Die Marktguru-Keys sind bereits eingetragen — nichts ändern.

---

## 3. Abhängigkeiten installieren

```bash
npm install
```

---

## 4. App bauen

```bash
npm run build
```

---

## 5. Datenbank erstellen

```bash
npx tsx scripts/init-db.ts
```

Das legt die leere Datenbank (`essensplan.db`) an.
**Standard-Passwort für den Login: `familie123`**
Bitte direkt in den Einstellungen ändern!

---

## 6. App starten

### Mit systemd (empfohlen)

Datei `/etc/systemd/system/essensplan.service` erstellen:

```ini
[Unit]
Description=Essensplan Familie
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/essensplan-familie
ExecStart=/usr/bin/node node_modules/.bin/next start
Restart=on-failure
Environment=NODE_ENV=production
EnvironmentFile=/var/www/essensplan-familie/.env.local

[Install]
WantedBy=multi-user.target
```

Aktivieren und starten:
```bash
systemctl daemon-reload
systemctl enable essensplan
systemctl start essensplan
```

### Alternativ: pm2

```bash
npm install -g pm2
pm2 start "npm run start" --name essensplan
pm2 save
pm2 startup
```

---

## 7. Apache konfigurieren

```apache
<VirtualHost *:443>
    ServerName essensplan.loecke.eu

    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/essensplan.loecke.eu/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/essensplan.loecke.eu/privkey.pem
</VirtualHost>
```

```bash
a2enmod proxy proxy_http
systemctl reload apache2
```

---

## Hinweise

- Die Datenbank liegt als Datei: `/var/www/essensplan-familie/essensplan.db`
- Backup: einfach diese Datei kopieren
- Die App läuft auf Port 3000 (intern, nicht öffentlich)
- Logs: `journalctl -u essensplan -f` (mit systemd)
