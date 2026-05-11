export const dynamic = 'force-dynamic';

import { getDb, plain } from '@/lib/db';
import { parseSteps } from '@/lib/steps';
import { notFound } from 'next/navigation';
import RecipeDetailClient from './RecipeDetailClient';

function getMondayISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RecipeDetailPage({ params }: Props) {
  const { id } = await params;
  const db = getDb();

  const recipe = plain(db.prepare('SELECT * FROM recipes WHERE id = ?').get(Number(id))) as {
    id: number; name: string; ingredients: string; recipe_text: string | null;
  } | undefined;

  if (!recipe) notFound();

  const weekplanRow = plain(db.prepare(
    "SELECT * FROM weekplan WHERE recipe_id = ? AND week_start = ? AND status IN ('confirmed', 'suggestion') ORDER BY id DESC LIMIT 1"
  ).get(Number(id), getMondayISO())) as { id: number; status: string; score: number | null; offers: string | null } | undefined;

  const settings = plain(db.prepare('SELECT shopping_date FROM settings WHERE id = 1').get()) as { shopping_date: string | null } | undefined;
  const shoppingDate = settings?.shopping_date ?? new Date().toISOString().split('T')[0];

  const ingredients: string[] = JSON.parse(recipe.ingredients);
  const rawOffers: { ingredient: string; shop: string; label: string; validFrom?: string; validTo?: string }[] = weekplanRow?.offers ? JSON.parse(weekplanRow.offers) : [];

  const offers = rawOffers.map((o) => {
    let expired = false;
    if (o.validFrom || o.validTo) {
      if (o.validFrom && shoppingDate < o.validFrom) expired = true;
      if (o.validTo && shoppingDate > o.validTo) expired = true;
    }
    return { ...o, expired };
  });

  return (
    <RecipeDetailClient
      recipe={{ id: recipe.id, name: recipe.name, ingredients, steps: parseSteps(recipe.recipe_text) }}
      weekplanId={weekplanRow?.id ?? null}
      status={weekplanRow?.status ?? null}
      score={weekplanRow?.score ?? null}
      offers={offers}
    />
  );
}
