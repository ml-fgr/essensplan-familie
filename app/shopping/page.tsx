export const dynamic = 'force-dynamic';

import { getDb } from '@/lib/db';
import ShoppingClient from './ShoppingClient';

function getMondayISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export default function ShoppingPage() {
  const db = getDb();
  const weekStart = getMondayISO();

  const rows = db.prepare(`
    SELECT w.offers, r.ingredients, r.name as recipe_name
    FROM weekplan w
    JOIN recipes r ON r.id = w.recipe_id
    WHERE w.week_start = ? AND w.status = 'confirmed'
    ORDER BY w.position
  `).all(weekStart) as { offers: string | null; ingredients: string; recipe_name: string }[];

  const kinderRows = db.prepare(`
    SELECT r.ingredients, r.name as recipe_name
    FROM kinderplan k
    JOIN recipes r ON r.id = k.recipe_id
    ORDER BY k.position, k.added_at
  `).all() as { ingredients: string; recipe_name: string }[];

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

  for (const row of kinderRows) {
    const ingredients: string[] = JSON.parse(row.ingredients);
    const label = `${row.recipe_name} 🧒`;
    for (const ing of ingredients) {
      if (!ingredientMap[ing]) {
        ingredientMap[ing] = { recipes: [], offer: null, checked: checkMap[ing] ?? false };
      }
      if (!ingredientMap[ing].recipes.includes(label)) {
        ingredientMap[ing].recipes.push(label);
      }
    }
  }

  const withOffer = Object.entries(ingredientMap)
    .filter(([, v]) => v.offer !== null)
    .map(([name, v]) => ({ name, ...v }));

  const withoutOffer = Object.entries(ingredientMap)
    .filter(([, v]) => v.offer === null)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));

  return <ShoppingClient withOffer={withOffer} withoutOffer={withoutOffer} />;
}
