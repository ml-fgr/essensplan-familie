import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const row = db.prepare('SELECT city, zip_codes, shopping_date FROM settings WHERE id = 1').get() as
    { city: string; zip_codes: string; shopping_date: string | null } | undefined;
  if (!row) return NextResponse.json({ city: '', zip_count: 0, shopping_date: null });
  const zips = JSON.parse(row.zip_codes) as string[];
  return NextResponse.json({ city: row.city, zip_count: zips.length, shopping_date: row.shopping_date });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const db = getDb();

  if ('city' in body) {
    db.prepare('UPDATE settings SET city = ?, zip_codes = ? WHERE id = 1')
      .run(body.city.trim(), JSON.stringify(body.zip_codes));
  }
  if ('shopping_date' in body) {
    db.prepare('UPDATE settings SET shopping_date = ? WHERE id = 1')
      .run(body.shopping_date ?? null);
  }

  return NextResponse.json({ ok: true });
}
