import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const weekStart = getMondayISO();

  const rows = db.prepare(`
    SELECT w.offers, r.ingredients, r.name as recipe_name
    FROM weekplan w
    JOIN recipes r ON r.id = w.recipe_id
    WHERE w.week_start = ? AND w.status = 'confirmed'
    ORDER BY w.position
  `).all(weekStart) as { offers: string | null; ingredients: string; recipe_name: string }[];

  const checks = db.prepare('SELECT ingredient, checked FROM shopping_checks').all() as { ingredient: string; checked: number }[];
  const checkMap: Record<string, boolean> = {};
  for (const c of checks) checkMap[c.ingredient] = c.checked === 1;

  const ingredientMap: Record<string, { recipes: string[]; offer: { shop: string; label: string } | null; checked: boolean }> = {};

  for (const row of rows) {
    const ingredients: string[] = JSON.parse(row.ingredients);
    const offers: { ingredient: string; shop: string; label: string }[] = row.offers ? JSON.parse(row.offers) : [];

    for (const ing of ingredients) {
      if (!ingredientMap[ing]) {
        const offer = offers.find((o) => o.ingredient.toLowerCase() === ing.toLowerCase());
        ingredientMap[ing] = {
          recipes: [],
          offer: offer ? { shop: offer.shop, label: offer.label } : null,
          checked: checkMap[ing] ?? false,
        };
      }
      if (!ingredientMap[ing].recipes.includes(row.recipe_name)) {
        ingredientMap[ing].recipes.push(row.recipe_name);
      }
    }
  }

  const withOffer = Object.entries(ingredientMap).filter(([, v]) => v.offer !== null).map(([name, v]) => ({ name, ...v }));
  const withoutOffer = Object.entries(ingredientMap).filter(([, v]) => v.offer === null).map(([name, v]) => ({ name, ...v })).sort((a, b) => a.name.localeCompare(b.name, 'de'));

  return NextResponse.json({ withOffer, withoutOffer });
}

export async function PATCH(req: NextRequest) {
  const { ingredient, checked } = await req.json();
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO shopping_checks (ingredient, checked) VALUES (?, ?)').run(ingredient, checked ? 1 : 0);
  return NextResponse.json({ ok: true });
}

function getMondayISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}
