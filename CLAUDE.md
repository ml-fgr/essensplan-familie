# CLAUDE.md — Familien-Essensplaner

Projekt-Kontext für Claude Code. Diese Datei enthält **alles**, was du brauchst, um die App zu implementieren — Briefing, Design-Entscheidungen, UX-Verhalten und Reihenfolge.

---

## 1. Projekt auf einen Satz

Private, passwortgeschützte Web-App, die für eine Familie wöchentlich einen günstigen Essensplan aus eigenen Rezepten und aktuellen Supermarkt-Angeboten (Marktguru-API) erstellt. Live unter `https://essensplan.loecke.eu`.

---

## 2. Tech-Stack

| Schicht | Technologie |
|---|---|
| Framework | **Next.js (App Router, React 18)** |
| Sprache | TypeScript |
| Backend | Next.js API Routes |
| DB | **SQLite** (Datei auf Server, einfach zu betreiben) — Schema klein genug |
| ORM | better-sqlite3 (synchron, ausreichend) **oder** Prisma falls Schema wächst |
| Auth | bcrypt + httpOnly Session-Cookie (7 Tage) |
| Hosting | Eigener Server, Apache `mod_proxy` → Next.js auf Port 3000 |
| SSL | Let's Encrypt via certbot Apache-Plugin |
| Angebote | Marktguru-API, PLZ-gefiltert |
| State | React lokal + Server-Routen; **kein Redux/Zustand nötig** |
| Styling | CSS-Module **oder** Tailwind — Tailwind empfohlen für mobile-first |
| Touch/Swipe | Framer Motion **oder** eigene Touch-Events (siehe Prototyp `src/swipe.jsx`) |

---

## 3. Datenbank-Schema

```sql
CREATE TABLE recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  ingredients TEXT NOT NULL,        -- JSON-String: ["Tomaten","Mehl",...]
  recipe_text TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE weekplan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('confirmed','suggestion')),
  position INTEGER NOT NULL,
  week_start TEXT NOT NULL,         -- ISO-Date des Montags
  score REAL,                       -- 0..1, optional, für Anzeige
  offers TEXT                       -- JSON: [{ingredient,shop,label}, ...]
);

CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  city TEXT NOT NULL,
  zip_codes TEXT NOT NULL,          -- JSON: ["50667","50668",...]
  password_hash TEXT NOT NULL
);
```

Nur **eine** Zeile in `settings` — die ganze App ist single-tenant.

---

## 4. Auth

- Login-Seite (`/login`) mit Passwort-Feld.
- API-Route `POST /api/login` prüft gegen `settings.password_hash` (bcrypt).
- Bei Erfolg: Session-Cookie `essensplan_sid` (httpOnly, Secure, SameSite=Lax, 7 Tage). Der Cookie-Wert ist eine signierte Session-ID (JWT oder iron-session).
- **Middleware** in `middleware.ts` schützt alle Routen außer `/login`, `/api/login`, `/robots.txt`, statische Assets.
- Passwortänderung: `POST /api/settings/password` mit altem + neuem Passwort.

---

## 5. Visuelles Design (final entschieden)

### Farbschema: „Fresh Garden"

```css
:root {
  --bg:            #f6f8f3;   /* App-Hintergrund */
  --bg-elevated:   #ffffff;   /* Cards, Inputs */
  --card:          #ebf0e3;
  --chip:          #e6ece0;
  --fg:            #1f2a22;   /* Text */
  --muted:         #7c8a7c;   /* Sekundärtext */
  --accent:        #4d7c4a;   /* Buttons, Akzente, Score-Highlight */
  --accent-dark:   #3a6037;
  --accent-soft:   #d6e4cf;
  --accent-soft-faint: #eef3e8;
  --danger:        #c64f3a;
}
```

### Typografie

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, system-ui, sans-serif;
```

- Große Titel: 30–34px, weight 700, `letter-spacing: -0.02em`
- Body: 15px
- Labels/Hints: 11.5–12.5px, color `var(--muted)`
- Section-Titel (klein): 11.5px, 600, uppercase, `letter-spacing: 0.07em`

### Layout-Prinzipien

- **Mobile-first ab 375px**. Funktioniert auch auf Desktop (zentrierte Spalte oder volle Breite).
- Rounded corners durchgängig: Cards = 14px, Buttons = 12–14px, Pills = 999px.
- Schatten sehr subtil — meist nur `inset 0 0 0 0.5px rgba(31,42,34,0.06)` für Card-Outlines, FABs bekommen weicheres `0 8px 22px -10px`.
- iOS-Statusbar nicht selbst rendern (im Browser).

### FAB-Layout (Wochenübersicht)

Zwei zentrierte FABs am unteren Rand:
- `＋` (neutral, weiß) — neues Rezept
- `⟳` (Akzent grün, primär) — Wochenplan refresh

Gear- und Cart-Icon (Einkaufsliste) als kleine Pills oben rechts im Header.

---

## 6. UI-Verhalten — final entschieden

### Hauptansicht (`/`)

Listendarstellung von oben nach unten:

1. **7 bestätigte Gerichte** — `opacity: 1.0`
   - Sortierung nur per `position`-Feld (**keine Wochentags-Labels**)
   - Pro Zeile: kleiner **Score-Indikator als Badge** „n/m" (n = Zutaten im Angebot, m = gesamt)
   - Info-Button rechts → öffnet Detail-Seite
2. **0–5 KI-Vorschläge** — `opacity: 0.5`
   - Kleiner Hinweistext über der Section: *„KI-Vorschläge basierend auf Angeboten"*
3. **Restliche Rezepte** — `opacity: 0.3`
   - Alphabetisch sortiert (deutsche Collation)

### Interaktionen

- **Swipe nach links** auf jeder Zeile → Action-Layer mit:
  - `Aus Plan` (gelb/orange) — nur bei `confirmed` / `suggestion`
  - `Löschen` (rot) — immer, mit **Sicherheitsdialog**:
    > „Soll dieses Rezept wirklich gelöscht werden?" — Abbrechen / Löschen
- **Tap auf 30%-Eintrag** → fügt Rezept sofort zum Wochenplan hinzu (`status='confirmed'`, nächste freie `position`, **ohne** Angebote zu prüfen).
- **Tap auf info-Button** (oder ganze Zeile bei `confirmed`/`suggestion`) → Detail-Seite mit Zurück-Button (`/recipe/:id`).
- **Refresh-Button**: löst den ganzen Refresh-Prozess aus (siehe §8). Während dessen **Vollbild-Loading-State**.
- **Wochenplan bleibt bestehen**, bis Refresh manuell gedrückt wird.

### Rezept-Detail (`/recipe/:id`)

- Eigene Seite mit Zurück-Button (kein Modal-Sheet).
- Score-Banner oben (n/m Zutaten im Angebot, %).
- Zutaten-Liste; bei jedem Eintrag, der im Angebot ist: Rabatt-Badge + Shop-Name rechts.
- Optional darunter `recipe_text`.
- Bei bestätigtem/Vorschlag-Rezept: Button „Aus Wochenplan entfernen" am Ende.

### Rezept hinzufügen (`/recipe/new`)

- Pflicht: `Name` + mindestens 1 Zutat.
- Zutaten als Liste mit Inline-Add-Input und Löschen-Button pro Eintrag.
- `recipe_text` als optionales Textarea.
- Speichern → zurück zur Hauptansicht.

### Einkaufsliste (`/shopping`)

- **Eigene Seite**, erreichbar über Cart-Icon im Header der Hauptansicht.
- Automatisch aus den **7 bestätigten Rezepten** generiert.
- Zutaten **dedupliziert**; gruppiert in zwei Sections:
  1. „Im Angebot" — mit Rabatt + Shop-Badge
  2. „Weitere Zutaten"
- Pro Zutat: welche Rezepte sie nutzen (klein darunter).
- Checkboxen mit Strikethrough beim Abhaken; State client-side (Session-Storage oder DB-Spalte — Entscheidung Claude Code, bevorzugt **DB**, damit familienweit synchron).

### Einstellungen (`/settings`)

- Stadt-Freitext-Eingabe; live-Hinweis darunter wie viele PLZ erkannt werden.
- Passwort ändern (altes + neues PW).
- „Abmelden"-Button am Ende.

### Onboarding (leere DB)

Wenn `recipes`-Tabelle leer ist:
- Statt der Hauptansicht: zentrierter Empty-State mit Icon + Headline „So geht's los" + Erklärtext + Primärbutton „Rezept hinzufügen".
- Hinweis: „Tipp: Auch Stadt eintragen, damit Angebote gefunden werden."

### Refresh-Loading (Vollbild)

- Über die ganze App gelegt (z-index hoch, leichter Blur des Hintergrunds).
- Pulsierender Akzent-Kreis mit Spin-Icon.
- Schrittliste (jeder Schritt wird abgehakt):
  1. „Lade Postleitzahlen für {Stadt}…"
  2. „Frage Marktguru-API ab…"
  3. „Berechne Angebots-Score pro Rezept…"
  4. „Erstelle Wochenplan…"
- Reale Schritte sollen den Status realistisch reflektieren (per Server-Sent Events oder Polling, **oder** einfach Step-Timer der die UI ablaufen lässt, während die API arbeitet — pragmatisch).

---

## 7. Marktguru-API — Refresh-Prozess

```
POST /api/refresh
1. Lade settings.zip_codes
2. Für jedes Rezept, für jede Zutat:
     GET https://api.marktguru.de/api/v1/offers/search
       ?as=web&limit=50&zipCode={PLZ}&q={Zutat}
   (idealerweise parallel mit Limit & Throttling; Cache-Layer pro Zutat × PLZ-Set für Lauf-Dauer)
3. Pro Rezept: score = (Zutaten mit ≥1 Treffer) / (gesamtZutaten)
4. Sortiere Rezepte nach score absteigend.
5. Top 7 → weekplan rows status='confirmed', position 1..7
   Rang 8..12 → status='suggestion', position 8..12 (max 5)
6. Truncate alte weekplan-Rows mit gleichem week_start, schreibe neue.
7. Speichere offers-JSON pro Row (max ~5 Einträge zur Anzeige).
```

API-Keys (öffentlich aus Community):

```
x-clientkey: WU/RH+PMGDi+gkZer3WbMelt6zcYHSTytNB7VpTia90=
x-apikey:    8Kk+pmbf7TgJ9nVj2cXeA7P5zBGv8iuutVVMRfOfvNE=
```

Bitte als ENV-Var (`MARKTGURU_CLIENT_KEY` / `MARKTGURU_API_KEY`) in `.env.local`.

---

## 8. PLZ-Mapping (Stadt → PLZ-Liste)

- Mapping passiert **im Backend**, bevor die Marktguru-API gerufen wird.
- Implementierung: hardcodiertes Dict für die häufigsten deutschen Städte **oder** offene PLZ-DB (z. B. `https://github.com/zauberware/postal-codes-json-xml-csv`).
- Beispiel Köln → 44 PLZ. Die App zeigt die Anzahl, nicht die Liste, im Settings-Screen.
- Marktguru wird **nicht** mit allen PLZ gleichzeitig gerufen — eine repräsentative PLZ (zentrale erste) reicht für die meisten Angebote. Falls nötig: mehrere PLZ probieren und Treffer mergen.

---

## 9. Routen-Übersicht

| Route | Inhalt |
|---|---|
| `/login` | Passwort-Eingabe |
| `/` | Hauptansicht (Wochenübersicht) — **redirect → `/onboarding` wenn 0 Rezepte** |
| `/onboarding` | Empty-State |
| `/recipe/new` | Neues Rezept Formular |
| `/recipe/[id]` | Rezept-Detail (mit Angeboten falls in weekplan) |
| `/shopping` | Einkaufsliste |
| `/settings` | Stadt + Passwort |
| `/api/login` | POST Login |
| `/api/recipes` | GET/POST |
| `/api/recipes/[id]` | GET/PUT/DELETE |
| `/api/weekplan` | GET |
| `/api/weekplan/[id]` | DELETE (aus Plan entfernen) |
| `/api/weekplan/manual-add` | POST (30 %-Tap-Logik) |
| `/api/refresh` | POST → triggert Marktguru-Lauf |
| `/api/shopping` | GET aggregierte Zutaten; PATCH für Checkboxen |
| `/api/settings` | GET/PUT |
| `/api/settings/password` | POST |

---

## 10. Implementierungs-Reihenfolge

1. `npx create-next-app@latest essensplan --typescript --app --tailwind`
2. SQLite + Schema-Migration (`scripts/init-db.ts`)
3. Auth: bcrypt, Session-Cookie, Middleware
4. Rezept-CRUD-API + UI (`/recipe/new`, `/recipe/[id]`)
5. Hauptansicht (`/`) mit den drei Opacity-Tiers (statisch, ohne Refresh-Logik)
6. iOS-Swipe-Gesten + Sicherheitsdialog (siehe `src/swipe.jsx` im Prototyp als Referenz)
7. Marktguru-Integration + Refresh-Loading
8. Einkaufsliste mit DB-Sync der Checkboxen
9. Einstellungen (Stadt-Mapping + Passwort)
10. Onboarding-Redirect bei leerer DB
11. `public/robots.txt`:
    ```
    User-agent: *
    Disallow: /
    ```
12. Apache-VHost + Let's Encrypt:
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
13. `systemd`-Service für `next start` (oder `pm2`)

---

## 11. Design-Prototyp

Im selben Projekt liegt **`Essensplan.html`** als interaktiver HTML-Prototyp (React + Babel) mit allen Screens und der finalen Optik. Die JSX-Quellen unter `src/` zeigen:

- `src/data.jsx` — Mock-Datenstruktur (Rezepte/weekplan/offers) — **1:1 die Form, die das echte Backend liefern soll**
- `src/swipe.jsx` — funktionierende Touch+Mouse Swipe-Implementierung (referenz für Framer-Motion-Variante)
- `src/screens-*.jsx` — pixelgenauer Look aller Screens

Beim Implementieren bitte **diese Files als visuelle & strukturelle Referenz** verwenden. Sie sind **keine** Backend-Codebasis — nur Design-Spec.

---

## 12. Was beim Schreiben besonders beachten

- **Statusbar-Padding**: Top-Padding ~54px im App-Wrapper, wenn die Browser-Statusbar überlappt (PWA-Modus).
- **Responsive**: Phone (375px+) primär. Auf Desktop entweder volle Breite begrenzen (max 480px) oder neutral fluid.
- **Optimistic UI**: Add/Remove/Delete sofort lokal anzeigen, dann mit Backend abgleichen.
- **Refresh ist destruktiv**: Aktueller Wochenplan wird ersetzt. Vor dem Lauf einen kurzen Hinweis-Dialog überlegen? — *Nicht entschieden, evtl. später.*
- **Fehlerbehandlung Marktguru**: API-Calls können fehlschlagen. Bei Fehler → kompletten Plan trotzdem speichern, aber Score = 0 und ein dezenter Banner „Angebote konnten nicht geladen werden" auf der Hauptansicht.
- **Deutsche Strings & Sortierung**: durchgehend deutsch. `localeCompare('de')` für Sortierung.

---

## 13. Out of Scope (v1)

- Push-Notifications
- Mehrere Wochen-History
- Mehrere Familienmitglieder mit eigenen Accounts
- Dark Mode
- Foto-Upload pro Rezept
- Mengen/Einheiten bei Zutaten (nur Name reicht für API-Matching)

Bei Bedarf später nachziehen.

---

*Letztes Update: nach Design-Abnahme — Schema „Fresh Garden", iOS-nahes Mobile-UI, Listendarstellung mit Opacity-Tiers.*
