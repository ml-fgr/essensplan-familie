import { DatabaseSync } from 'node:sqlite';
import { join } from 'path';

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!db) {
    const dbPath = process.env.DB_PATH ?? join(process.cwd(), 'essensplan.db');
    db = new DatabaseSync(dbPath);
    db.exec('PRAGMA foreign_keys = ON;');
    // Migration: Spalten hinzufügen falls noch nicht vorhanden
    try { db.exec("ALTER TABLE settings ADD COLUMN shopping_date TEXT"); } catch { /* bereits vorhanden */ }
    try { db.exec("ALTER TABLE settings ADD COLUMN shops TEXT"); } catch { /* bereits vorhanden */ }
    try { db.exec("ALTER TABLE settings ADD COLUMN family_name TEXT"); } catch { /* bereits vorhanden */ }
  }
  return db;
}

// node:sqlite gibt Objekte mit null-Prototype zurück — Next.js kann diese
// nicht an Client-Komponenten übergeben. Diese Funktion wandelt sie um.
export function plain<T>(value: T): T {
  if (value == null) return value;
  return JSON.parse(JSON.stringify(value));
}
