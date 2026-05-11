import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const MAX_KINDERPLAN = 7;

export async function GET() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT k.id, k.recipe_id, k.added_at, r.name, r.ingredients
    FROM kinderplan k
    JOIN recipes r ON r.id = k.recipe_id
    ORDER BY k.position, k.added_at
  `).all();
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const db = getDb();
  const { recipe_id } = await req.json() as { recipe_id: number };

  const count = (db.prepare('SELECT COUNT(*) as cnt FROM kinderplan').get() as { cnt: number }).cnt;
  if (count >= MAX_KINDERPLAN) {
    return NextResponse.json({ error: 'Kinderplan ist voll (max. 7 Gerichte)' }, { status: 400 });
  }

  const existing = db.prepare('SELECT id FROM kinderplan WHERE recipe_id = ?').get(recipe_id);
  if (existing) {
    return NextResponse.json({ error: 'Bereits im Kinderplan' }, { status: 400 });
  }

  const pos = count + 1;
  const result = db.prepare('INSERT INTO kinderplan (recipe_id, position) VALUES (?, ?)').run(recipe_id, pos);
  return NextResponse.json({ id: result.lastInsertRowid, recipe_id, position: pos });
}
