export const dynamic = 'force-dynamic';

import { getDb } from '@/lib/db';
import AngeboteClient from './AngeboteClient';

type Offer = {
  id: number;
  name: string;
  description: string;
  price: number;
  oldPrice: number | null;
  shop: string;
  category: string;
  validFrom: string;
  validTo: string;
};

type RawOffer = {
  id: number;
  product?: { name?: string };
  description?: string;
  price?: number;
  oldPrice?: number | null;
  advertisers?: { name?: string }[];
  categories?: { name?: string }[];
  validityDates?: { from?: string; to?: string }[];
};

const CLIENT_KEY = process.env.MARKTGURU_CLIENT_KEY ?? '';
const API_KEY = process.env.MARKTGURU_API_KEY ?? '';

// Breite Suchbegriffe damit alle Supermärkte in den Ergebnissen auftauchen.
// Die ungefilterte /offers-API liefert nur REWE – /offers/search gibt alle Shops.
const SEARCH_TERMS = [
  'Obst', 'Gemüse', 'Fleisch', 'Fisch', 'Milch', 'Käse',
  'Brot', 'Getränke', 'Joghurt', 'Tiefkühl',
];

const SHOP_KEYWORDS: Record<string, string> = {
  'Aldi Süd': 'aldi süd', 'Aldi Nord': 'aldi nord', 'Rewe': 'rewe',
  'Edeka': 'edeka', 'Lidl': 'lidl', 'Kaufland': 'kaufland',
  'Penny': 'penny', 'Netto': 'netto',
};

function shopAllowed(shopName: string, allowedShops: string[]): boolean {
  if (allowedShops.length === 0) return true;
  const lower = shopName.toLowerCase();
  return allowedShops.some((s) => {
    const keyword = SHOP_KEYWORDS[s] ?? s.toLowerCase();
    return lower.includes(keyword);
  });
}

async function searchOffers(zip: string, query: string): Promise<RawOffer[]> {
  const res = await fetch(
    `https://api.marktguru.de/api/v1/offers/search?as=web&limit=50&zipCode=${zip}&q=${encodeURIComponent(query)}`,
    { headers: { 'x-clientkey': CLIENT_KEY, 'x-apikey': API_KEY }, cache: 'no-store' }
  );
  if (!res.ok) return [];
  const data = await res.json() as { results?: RawOffer[] };
  return data.results ?? [];
}

export default async function AngebotePage() {
  const db = getDb();
  const row = db.prepare('SELECT zip_codes, shops FROM settings WHERE id = 1').get() as
    { zip_codes: string; shops: string | null } | undefined;

  if (!row) return <AngeboteClient offers={[]} allowedShops={[]} error="Einstellungen fehlen" />;

  const zipCodes: string[] = JSON.parse(row.zip_codes);
  const primaryZip = zipCodes[0];
  if (!primaryZip) return <AngeboteClient offers={[]} allowedShops={[]} error="Keine Postleitzahl konfiguriert" />;

  const allowedShops: string[] = row.shops
    ? JSON.parse(row.shops)
    : ['Aldi Süd', 'Aldi Nord', 'Rewe', 'Edeka', 'Lidl', 'Kaufland', 'Penny', 'Netto'];

  let offers: Offer[] = [];
  let error: string | undefined;

  try {
    // Alle Suchbegriffe parallel abfragen
    const results = await Promise.all(
      SEARCH_TERMS.map((term) => searchOffers(primaryZip, term))
    );

    // Deduplizieren nach ID, Shop-Filter anwenden
    const seen = new Set<number>();
    for (const batch of results) {
      for (const r of batch) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        const shop = r.advertisers?.[0]?.name ?? '';
        if (!shopAllowed(shop, allowedShops)) continue;
        offers.push({
          id: r.id,
          name: r.product?.name ?? r.description ?? '',
          description: r.description ?? '',
          price: r.price ?? 0,
          oldPrice: r.oldPrice ?? null,
          shop: shop || 'Unbekannt',
          category: r.categories?.[0]?.name ?? 'Sonstiges',
          validFrom: r.validityDates?.[0]?.from ?? '',
          validTo: r.validityDates?.[0]?.to ?? '',
        });
      }
    }
  } catch {
    error = 'Angebote konnten nicht geladen werden';
  }

  return <AngeboteClient offers={offers} error={error} allowedShops={allowedShops} />;
}
