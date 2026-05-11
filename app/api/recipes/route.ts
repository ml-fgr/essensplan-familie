import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const recipes = db.prepare('SELECT * FROM recipes ORDER BY name COLLATE NOCASE').all();
  return NextResponse.json(recipes);
}

export async function POST(req: NextRequest) {
  const { name, ingredients, recipe_text } = await req.json();
  if (!name || !ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return NextResponse.json({ error: 'Name und Zutaten sind Pflicht' }, { status: 400 });
  }
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO recipes (name, ingredients, recipe_text) VALUES (?, ?, ?)'
  ).run(name.trim(), JSON.stringify(ingredients.map((i: string) => i.trim()).filter(Boolean)), recipe_text?.trim() || null);

  const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(recipe, { status: 201 });
}
