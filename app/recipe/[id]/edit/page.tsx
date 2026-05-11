import { getDb, plain } from '@/lib/db';
import { parseSteps } from '@/lib/steps';
import { notFound } from 'next/navigation';
import EditRecipeClient from './EditRecipeClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditRecipePage({ params }: Props) {
  const { id } = await params;
  const db = getDb();

  const recipe = plain(db.prepare('SELECT * FROM recipes WHERE id = ?').get(Number(id))) as {
    id: number; name: string; ingredients: string; recipe_text: string | null;
  } | undefined;

  if (!recipe) notFound();

  return (
    <EditRecipeClient
      id={recipe.id}
      initialName={recipe.name}
      initialIngredients={JSON.parse(recipe.ingredients) as string[]}
      initialSteps={parseSteps(recipe.recipe_text)}
    />
  );
}
