export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getDb, plain } from '@/lib/db';
import HomeClient from './HomeClient';

export default function HomePage() {
  const db = getDb();
  const recipeCount = (db.prepare('SELECT COUNT(*) as cnt FROM recipes').get() as { cnt: number }).cnt;

  if (recipeCount === 0) redirect('/onboarding');

  const weekStart = getMondayISO();

  const weekplanRows = db.prepare(`
    SELECT w.*, r.name, r.ingredients, r.recipe_text
    FROM weekplan w
    JOIN recipes r ON r.id = w.recipe_id
    WHERE w.week_start = ?
    ORDER BY w.position
  `).all(weekStart) as WeekplanRow[];

  const allRecipes = db.prepare('SELECT * FROM recipes ORDER BY name COLLATE NOCASE').all() as Recipe[];

  const weekplanRecipeIds = new Set(weekplanRows.map((r) => r.recipe_id));
  const restRecipes = allRecipes.filter((r) => !weekplanRecipeIds.has(r.id));

  return <HomeClient weekplan={plain(weekplanRows)} restRecipes={plain(restRecipes)} />;
}

function getMondayISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export interface Recipe {
  id: number;
  name: string;
  ingredients: string;
  recipe_text: string | null;
  created_at: string;
}

export interface WeekplanRow {
  id: number;
  recipe_id: number;
  status: 'confirmed' | 'suggestion';
  position: number;
  week_start: string;
  score: number | null;
  offers: string | null;
  name: string;
  ingredients: string;
  recipe_text: string | null;
}
