import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(Number(id));
  if (!recipe) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
  return NextResponse.json(recipe);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, ingredients, recipe_text } = await req.json();
  const db = getDb();
  db.prepare(
    'UPDATE recipes SET name = ?, ingredients = ?, recipe_text = ? WHERE id = ?'
  ).run(name.trim(), JSON.stringify(ingredients), recipe_text?.trim() || null, Number(id));
  const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(Number(id));
  return NextResponse.json(recipe);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM recipes WHERE id = ?').run(Number(id));
  return NextResponse.json({ ok: true });
}
