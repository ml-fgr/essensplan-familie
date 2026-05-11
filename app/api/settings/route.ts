import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const DEFAULT_SHOPS = ['Aldi Süd', 'Aldi Nord', 'Rewe', 'Edeka'];

export async function GET() {
  const db = getDb();
  const row = db.prepare('SELECT city, zip_codes, shopping_date, shops, family_name FROM settings WHERE id = 1').get() as
    { city: string; zip_codes: string; shopping_date: string | null; shops: string | null; family_name: string | null } | undefined;
  if (!row) return NextResponse.json({ city: '', zip_count: 0, shopping_date: null, shops: DEFAULT_SHOPS, family_name: '' });
  const zips = JSON.parse(row.zip_codes) as string[];
  const shops = row.shops ? JSON.parse(row.shops) as string[] : DEFAULT_SHOPS;
  return NextResponse.json({ city: row.city, zip_count: zips.length, shopping_date: row.shopping_date, shops, family_name: row.family_name ?? '' });
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
  if ('shops' in body) {
    db.prepare('UPDATE settings SET shops = ? WHERE id = 1')
      .run(JSON.stringify(body.shops));
  }
  if ('family_name' in body) {
    db.prepare('UPDATE settings SET family_name = ? WHERE id = 1')
      .run((body.family_name as string).trim() || null);
  }

  return NextResponse.json({ ok: true });
}
