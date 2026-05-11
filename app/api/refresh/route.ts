import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const CLIENT_KEY = process.env.MARKTGURU_CLIENT_KEY ?? '';
const API_KEY = process.env.MARKTGURU_API_KEY ?? '';

const DEFAULT_SHOPS = ['Aldi Süd', 'Aldi Nord', 'Rewe', 'Edeka', 'Lidl', 'Kaufland', 'Penny', 'Netto'];

// Marktguru-Shopnamen enthalten oft Großschreibung oder Varianten — case-insensitiver Vergleich
const SHOP_KEYWORDS: Record<string, string> = {
  'Aldi Süd': 'aldi süd',
  'Aldi Nord': 'aldi nord',
  'Rewe': 'rewe',
  'Edeka': 'edeka',
  'Lidl': 'lidl',
  'Kaufland': 'kaufland',
  'Penny': 'penny',
  'Netto': 'netto',
};

function shopAllowed(shopName: string, allowedShops: string[]): boolean {
  if (allowedShops.length === 0) return true;
  const lower = shopName.toLowerCase();
  return allowedShops.some((s) => {
    const keyword = SHOP_KEYWORDS[s] ?? s.toLowerCase();
    return lower.includes(keyword);
  });
}

function getMondayISO(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

async function fetchOffers(zipCode: string, query: string, allowedShops: string[]): Promise<{ shop: string; label: string }[]> {
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
    return (data.results ?? [])
      .filter((r) => shopAllowed(r.advertisers?.[0]?.name ?? '', allowedShops))
      .slice(0, 3)
      .map((r) => ({
        shop: r.advertisers?.[0]?.name ?? 'Unbekannt',
        label: r.description ?? query,
      }));
  } catch {
    return [];
  }
}

export async function POST() {
  const db = getDb();
  const settings = db.prepare('SELECT zip_codes, shops, shopping_date, refresh_count, last_refresh_date FROM settings WHERE id = 1').get() as {
    zip_codes: string;
    shops: string | null;
    shopping_date: string | null;
    refresh_count: number | null;
    last_refresh_date: string | null;
  } | undefined;
  if (!settings) return NextResponse.json({ error: 'Keine Einstellungen gefunden' }, { status: 500 });

  const allowedShops: string[] = settings.shops ? JSON.parse(settings.shops) : DEFAULT_SHOPS;

  const zipCodes: string[] = JSON.parse(settings.zip_codes);
  const primaryZip = zipCodes[0];

  // Zufallsfaktor: 0 beim ersten Refresh des Tages, danach steigend bis max 0.9
  const shoppingDate = settings.shopping_date ?? new Date().toISOString().split('T')[0];
  const isNewDate = settings.last_refresh_date !== shoppingDate;
  const prevCount = settings.refresh_count ?? 0;
  const refreshCount = isNewDate ? 1 : prevCount + 1;
  const randomFactor = refreshCount === 1 ? 0 : Math.min(0.9, (refreshCount - 1) * 0.2);

  const recipes = db.prepare('SELECT * FROM recipes').all() as { id: number; name: string; ingredients: string }[];
  if (recipes.length === 0) return NextResponse.json({ error: 'Keine Rezepte vorhanden' }, { status: 400 });

  const scored: { recipe: (typeof recipes)[0]; score: number; finalScore: number; offers: { ingredient: string; shop: string; label: string }[] }[] = [];

  for (const recipe of recipes) {
    const ingredients: string[] = JSON.parse(recipe.ingredients);
    const offerResults: { ingredient: string; shop: string; label: string }[] = [];
    let hits = 0;

    await Promise.all(
      ingredients.map(async (ing) => {
        const results = await fetchOffers(primaryZip, ing, allowedShops);
        if (results.length > 0) {
          hits++;
          offerResults.push({ ingredient: ing, shop: results[0].shop, label: results[0].label });
        }
      })
    );

    const score = ingredients.length > 0 ? hits / ingredients.length : 0;
    // Angebots-Score mit zunehmendem Zufallsanteil mischen
    const finalScore = score * (1 - randomFactor) + Math.random() * randomFactor;

    scored.push({
      recipe,
      score,
      finalScore,
      offers: offerResults.slice(0, 5),
    });
  }

  scored.sort((a, b) => b.finalScore - a.finalScore);

  // Refresh-Zähler für diesen Einkaufstag speichern
  db.prepare('UPDATE settings SET refresh_count = ?, last_refresh_date = ? WHERE id = 1').run(refreshCount, shoppingDate);

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
