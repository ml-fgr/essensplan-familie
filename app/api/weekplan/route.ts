import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT w.*, r.name, r.ingredients, r.recipe_text
    FROM weekplan w
    JOIN recipes r ON r.id = w.recipe_id
    ORDER BY w.position
  `).all();
  return NextResponse.json(rows);
}
