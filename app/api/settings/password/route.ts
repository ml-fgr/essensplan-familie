import { NextRequest, NextResponse } from 'next/server';
import { compareSync, hashSync } from 'bcryptjs';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const oldPassword: unknown = body.oldPassword;
    const newPassword: unknown = body.newPassword;

    if (typeof oldPassword !== 'string' || typeof newPassword !== 'string' || !oldPassword || !newPassword) {
      return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 });
    }

    const db = getDb();
    const row = db.prepare('SELECT password_hash FROM settings WHERE id = 1').get() as { password_hash: string } | undefined;

    if (!row) {
      return NextResponse.json({ error: 'Einstellungen nicht gefunden' }, { status: 500 });
    }

    const hash = String(row.password_hash);
    if (!compareSync(oldPassword, hash)) {
      return NextResponse.json({ error: 'Altes Passwort falsch' }, { status: 401 });
    }

    const newHash = hashSync(newPassword, 10);
    db.prepare('UPDATE settings SET password_hash = ? WHERE id = 1').run(newHash);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[password] Fehler:', err);
    return NextResponse.json({ error: 'Serverfehler beim Ändern des Passworts' }, { status: 500 });
  }
}
