import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'fs';
import { join } from 'path';
import bcrypt from 'bcryptjs';

const dbPath = process.env.DB_PATH ?? join(process.cwd(), 'essensplan.db');

if (existsSync(dbPath)) {
  console.log('Datenbank existiert bereits, überspringe Init.');
  process.exit(0);
}

const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ingredients TEXT NOT NULL,
    recipe_text TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS weekplan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK(status IN ('confirmed','suggestion')),
    position INTEGER NOT NULL,
    week_start TEXT NOT NULL,
    score REAL,
    offers TEXT
  );

  CREATE TABLE IF NOT EXISTS shopping_checks (
    ingredient TEXT PRIMARY KEY,
    checked INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    city TEXT NOT NULL,
    zip_codes TEXT NOT NULL,
    password_hash TEXT NOT NULL
  );
`);

const hash = bcrypt.hashSync('familie123', 10);
db.prepare(`
  INSERT OR IGNORE INTO settings (id, city, zip_codes, password_hash)
  VALUES (1, 'Köln', '["50667","50668","50670","50672","50674","50676","50678","50679"]', ?)
`).run(hash);

db.close();
console.log('✓ Datenbank initialisiert. Standard-Passwort: familie123');
