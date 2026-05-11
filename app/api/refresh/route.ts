import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const CLIENT_KEY = process.env.MARKTGURU_CLIENT_KEY ?? '';
const API_KEY = process.env.MARKTGURU_API_KEY ?? '';

function getMondayISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

async function fetchOffers(zipCode: string, query: string): Promise<{ shop: string; label: string }[]> {
  try {
    const url = `https://api.marktguru.de/api/v1/offers/search?as=web&limit=50&zipCode=${encodeURIComponent(zipCode)}&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: {
        'x-clientkey': CLIENT_KEY,
        'x-apikey': API_KEY,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json() as { results?: { advertisers?: { name: string }[]; description?: string }[] };
    return (data.results ?? []).slice(0, 3).map((r) => ({
      shop: r.advertisers?.[0]?.name ?? 'Unbekannt',
      label: r.description ?? query,
    }));
  } catch {
    return [];
  }
}

export async function POST() {
  const db = getDb();
  const settings = db.prepare('SELECT zip_codes FROM settings WHERE id = 1').get() as { zip_codes: string } | undefined;
  if (!settings) return NextResponse.json({ error: 'Keine Einstellungen gefunden' }, { status: 500 });

  const zipCodes: string[] = JSON.parse(settings.zip_codes);
  const primaryZip = zipCodes[0];

  const recipes = db.prepare('SELECT * FROM recipes').all() as { id: number; name: string; ingredients: string }[];
  if (recipes.length === 0) return NextResponse.json({ error: 'Keine Rezepte vorhanden' }, { status: 400 });

  const scored: { recipe: (typeof recipes)[0]; score: number; offers: { ingredient: string; shop: string; label: string }[] }[] = [];

  for (const recipe of recipes) {
    const ingredients: string[] = JSON.parse(recipe.ingredients);
    const offerResults: { ingredient: string; shop: string; label: string }[] = [];
    let hits = 0;

    await Promise.all(
      ingredients.map(async (ing) => {
        const results = await fetchOffers(primaryZip, ing);
        if (results.length > 0) {
          hits++;
          offerResults.push({ ingredient: ing, shop: results[0].shop, label: results[0].label });
        }
      })
    );

    scored.push({
      recipe,
      score: ingredients.length > 0 ? hits / ingredients.length : 0,
      offers: offerResults.slice(0, 5),
    });
  }

  scored.sort((a, b) => b.score - a.score);

  const weekStart = getMondayISO();
  db.prepare('DELETE FROM weekplan WHERE week_start = ?').run(weekStart);

  const confirmed = scored.slice(0, 7);
  const suggestions = scored.slice(7, 12);

  for (let i = 0; i < confirmed.length; i++) {
    const { recipe, score, offers } = confirmed[i];
    db.prepare(
      'INSERT INTO weekplan (recipe_id, status, position, week_start, score, offers) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(recipe.id, 'confirmed', i + 1, weekStart, score, JSON.stringify(offers));
  }

  for (let i = 0; i < suggestions.length; i++) {
    const { recipe, score, offers } = suggestions[i];
    db.prepare(
      'INSERT INTO weekplan (recipe_id, status, position, week_start, score, offers) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(recipe.id, 'suggestion', i + 8, weekStart, score, JSON.stringify(offers));
  }

  return NextResponse.json({ ok: true, confirmed: confirmed.length, suggestions: suggestions.length });
}
