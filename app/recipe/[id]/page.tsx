import { getDb, plain } from '@/lib/db';
import { parseSteps } from '@/lib/steps';
import { notFound } from 'next/navigation';
import RecipeDetailClient from './RecipeDetailClient';

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
    "SELECT * FROM weekplan WHERE recipe_id = ? AND status IN ('confirmed', 'suggestion') ORDER BY id DESC LIMIT 1"
  ).get(Number(id))) as { id: number; status: string; score: number | null; offers: string | null } | undefined;

  const ingredients: string[] = JSON.parse(recipe.ingredients);
  const offers: { ingredient: string; shop: string; label: string }[] = weekplanRow?.offers ? JSON.parse(weekplanRow.offers) : [];

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
