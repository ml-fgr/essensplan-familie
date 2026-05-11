# Essensplan Familie — Installationsanleitung

Diese Anleitung erklärt Schritt für Schritt, wie du die App auf einem Server mit Apache (z. B. Froxlor, Hetzner, Uberspace) installierst. Kein Vorwissen nötig.

---

## Voraussetzungen

- Root- oder SSH-Zugang zum Server
- **Node.js 22.5 oder neuer** (`node --version` zum Prüfen)
- Apache mit aktiviertem `mod_proxy`, `mod_proxy_http` und `mod_rewrite`
- Eine Domain mit SSL-Zertifikat (Let's Encrypt reicht)

---

## Schritt 1 — Dateien auf den Server laden

SSH-Verbindung zum Server herstellen:

```bash
ssh root@DEINE-SERVER-IP
```

In den Ordner wechseln, in dem die App liegen soll (Beispiel für Froxlor):

```bash
cd /var/customers/webs/KUNDENNAME/deine-domain.de
```

Repo klonen:

```bash
git clone https://github.com/ml-fgr/essensplan-familie.git .
```

> Das `.` am Ende ist wichtig — es klont direkt in den aktuellen Ordner.

---

## Schritt 2 — Konfiguration erstellen

```bash
cp .env.local.example .env.local
nano .env.local
```

Folgende Werte anpassen:

| Variable | Was eintragen |
|---|---|
| `APP_DIR` | Absoluter Pfad zum App-Ordner, z. B. `/var/customers/webs/FGR053/essensplan.loecke.eu` |
| `DOMAIN` | Deine Domain, z. B. `essensplan.loecke.eu` |
| `SESSION_SECRET` | Mindestens 32 zufällige Zeichen — z. B. `meinGeheimnis2024xyzABC!!sicherheit99` |
| `PORT` | Port der App, Standard `3000` (bei mehreren Installationen: `3001`, `3002`, …) |
| `SERVICE_NAME` | Name des systemd-Diensts, z. B. `essensplan` (bei mehreren Installationen eindeutig wählen) |

Speichern: `Strg+O`, `Enter`, `Strg+X`.

---

## Schritt 3 — Abhängigkeiten installieren & App bauen

```bash
npm install
npm run build
```

Der Build dauert 1–2 Minuten.

---

## Schritt 4 — Datenbank anlegen

```bash
npx tsx scripts/init-db.ts
```

Das legt die Datei `essensplan.db` an.

**Standard-Passwort: `familie123`** — bitte nach dem ersten Login in den Einstellungen ändern!

---

## Schritt 5 — App als Dienst einrichten

Die App muss dauerhaft im Hintergrund laufen. Dafür gibt es das `setup.sh`-Skript, das alles automatisch erledigt:

```bash
chmod +x setup.sh
./setup.sh
```

Das Skript liest die Werte aus `.env.local` und richtet einen systemd-Dienst ein (oder pm2, falls systemd nicht verfügbar ist).

### Manuell prüfen ob die App läuft:

```bash
systemctl status essensplan
```

Ausgabe sollte `active (running)` zeigen. Logs:

```bash
journalctl -u essensplan -f
```

---

## Schritt 6 — Apache konfigurieren

### Option A: Froxlor / Hosting ohne Zugriff auf die Apache-Konfiguration

Die Datei `.htaccess` liegt bereits im Repo und ist vorkonfiguriert. Sie enthält:

```apache
DirectoryIndex disabled
RewriteEngine On
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
RequestHeader set X-Forwarded-Proto "https"
```

**Wenn du einen anderen Port als `3000` gewählt hast**, musst du die `3000` in der dritten Zeile anpassen:

```bash
nano .htaccess
# Zeile ändern: http://127.0.0.1:3001/$1 (dein Port)
```

Danach Apache neu laden (falls du Zugriff hast):

```bash
systemctl reload apache2
```

> In Froxlor wird `.htaccess` sofort ohne Neustart angewendet.

### Option B: Eigener Server mit Zugriff auf die Apache-Config

Statt `.htaccess` kannst du direkt im VirtualHost konfigurieren:

```apache
<VirtualHost *:443>
    ServerName deine-domain.de

    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3000/
    ProxyPassReverse / http://127.0.0.1:3000/

    RequestHeader set X-Forwarded-Proto "https"

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/deine-domain.de/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/deine-domain.de/privkey.pem
</VirtualHost>
```

```bash
a2enmod proxy proxy_http headers rewrite
systemctl reload apache2
```

---

## Fertig!

Öffne `https://deine-domain.de` im Browser, logge dich mit `familie123` ein und ändere das Passwort in den Einstellungen.

---

## Mehrere Installationen auf demselben Server

Kein Problem! Jede Installation braucht nur:

1. **Einen eigenen Ordner** (verschiedene Domains / Pfade)
2. **Einen anderen Port** in `.env.local` (`PORT=3001`, `PORT=3002`, …)
3. **Einen anderen Dienstnamen** (`SERVICE_NAME=essensplan2`)
4. **Die `.htaccess`** anpassen: `http://127.0.0.1:3001/$1`

Die Installationen sind völlig unabhängig voneinander — eigene Datenbank, eigene Einstellungen, eigenes Passwort.

---

## Updates einspielen

```bash
cd /var/customers/webs/KUNDENNAME/deine-domain.de
git pull origin main
npm install
npm run build
systemctl restart essensplan
```

---

## Häufige Probleme

| Problem | Ursache | Lösung |
|---|---|---|
| `404 This page could not be found` | Apache leitet Anfragen als `/index.html` weiter | `DirectoryIndex disabled` in `.htaccess` prüfen |
| App startet nicht | Node.js-Version zu alt | `node --version` → muss ≥ 22.5 sein |
| Login funktioniert nicht | `SESSION_SECRET` zu kurz | Mindestens 32 Zeichen in `.env.local` eintragen |
| Port-Konflikt | Zwei Instanzen auf Port 3000 | In `.env.local` verschiedene Ports vergeben |

---

## Backup

Die gesamte Datenbank steckt in einer einzigen Datei:

```bash
cp essensplan.db essensplan.db.backup
```
