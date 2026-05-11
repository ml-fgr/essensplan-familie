import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

function getMondayISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export async function POST(req: NextRequest) {
  const { recipe_id } = await req.json();
  const db = getDb();
  const weekStart = getMondayISO();

  const existing = db.prepare(
    'SELECT COUNT(*) as cnt FROM weekplan WHERE week_start = ? AND status = ?'
  ).get(weekStart, 'confirmed') as { cnt: number };

  if (existing.cnt >= 7) {
    return NextResponse.json({ error: 'Wochenplan ist bereits voll (7 Gerichte)' }, { status: 400 });
  }

  const nextPos = db.prepare(
    'SELECT COALESCE(MAX(position), 0) + 1 as pos FROM weekplan WHERE week_start = ?'
  ).get(weekStart) as { pos: number };

  db.prepare(
    'INSERT INTO weekplan (recipe_id, status, position, week_start, score) VALUES (?, ?, ?, ?, ?)'
  ).run(recipe_id, 'confirmed', nextPos.pos, weekStart, null);

  return NextResponse.json({ ok: true });
}
