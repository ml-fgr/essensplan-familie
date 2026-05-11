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

const CLIENT_KEY = process.env.MARKTGURU_CLIENT_KEY ?? '';
const API_KEY = process.env.MARKTGURU_API_KEY ?? '';

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

export default async function AngebotePage() {
  const db = getDb();
  const row = db.prepare('SELECT zip_codes, shops FROM settings WHERE id = 1').get() as
    { zip_codes: string; shops: string | null } | undefined;

  if (!row) return <AngeboteClient offers={[]} error="Einstellungen fehlen" />;

  const zipCodes: string[] = JSON.parse(row.zip_codes);
  const primaryZip = zipCodes[0];
  if (!primaryZip) return <AngeboteClient offers={[]} error="Keine Postleitzahl konfiguriert" />;

  const allowedShops: string[] = row.shops
    ? JSON.parse(row.shops)
    : ['Aldi Süd', 'Aldi Nord', 'Rewe', 'Edeka', 'Lidl', 'Kaufland', 'Penny', 'Netto'];

  let offers: Offer[] = [];
  let error: string | undefined;

  try {
    const res = await fetch(
      `https://api.marktguru.de/api/v1/offers?as=web&limit=300&zipCode=${primaryZip}`,
      { headers: { 'x-clientkey': CLIENT_KEY, 'x-apikey': API_KEY }, cache: 'no-store' }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

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

    const data = await res.json() as { results: RawOffer[] };
    offers = data.results
      .filter((r) => shopAllowed(r.advertisers?.[0]?.name ?? '', allowedShops))
      .map((r) => ({
        id: r.id,
        name: r.product?.name ?? r.description ?? '',
        description: r.description ?? '',
        price: r.price ?? 0,
        oldPrice: r.oldPrice ?? null,
        shop: r.advertisers?.[0]?.name ?? 'Unbekannt',
        category: r.categories?.[0]?.name ?? 'Sonstiges',
        validFrom: r.validityDates?.[0]?.from ?? '',
        validTo: r.validityDates?.[0]?.to ?? '',
      }));
  } catch {
    error = 'Angebote konnten nicht geladen werden';
  }

  return <AngeboteClient offers={offers} error={error} />;
}
