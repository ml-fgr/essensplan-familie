import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { oldPassword, newPassword } = await req.json();
  const db = getDb();
  const row = db.prepare('SELECT password_hash FROM settings WHERE id = 1').get() as { password_hash: string } | undefined;

  if (!row || !bcrypt.compareSync(oldPassword, row.password_hash)) {
    return NextResponse.json({ error: 'Altes Passwort falsch' }, { status: 401 });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE settings SET password_hash = ? WHERE id = 1').run(newHash);
  return NextResponse.json({ ok: true });
}
