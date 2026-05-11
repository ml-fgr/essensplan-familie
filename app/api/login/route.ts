import { NextRequest, NextResponse } from 'next/server';
import { compareSync } from 'bcryptjs';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  const { password, remember } = await req.json();
  const db = getDb();
  const row = db.prepare('SELECT password_hash FROM settings WHERE id = 1').get() as { password_hash: string } | undefined;

  if (!row || !compareSync(password, row.password_hash)) {
    return NextResponse.json({ error: 'Falsches Passwort' }, { status: 401 });
  }

  const session = await getSession(!!remember);
  session.authenticated = true;
  await session.save();

  return NextResponse.json({ ok: true });
}
