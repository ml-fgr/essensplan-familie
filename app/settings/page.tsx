export const dynamic = 'force-dynamic';

import { getDb } from '@/lib/db';
import SettingsClient from './SettingsClient';
import pkg from '../../package.json';

function todayISO() { return new Date().toISOString().split('T')[0]; }

const DEFAULT_SHOPS = ['Aldi Süd', 'Aldi Nord', 'Rewe', 'Edeka'];

export default function SettingsPage() {
  const db = getDb();
  const row = db.prepare('SELECT city, zip_codes, shopping_date, shops, family_name FROM settings WHERE id = 1').get() as
    { city: string; zip_codes: string; shopping_date: string | null; shops: string | null; family_name: string | null } | undefined;

  const city = row?.city ?? '';
  const zipCount = row ? (JSON.parse(row.zip_codes) as string[]).length : 0;
  const shoppingDate = row?.shopping_date ?? todayISO();
  const shops: string[] = row?.shops ? JSON.parse(row.shops) : DEFAULT_SHOPS;
  const familyName = row?.family_name ?? '';

  return (
    <SettingsClient
      city={city}
      zipCount={zipCount}
      shoppingDate={shoppingDate}
      localVersion={pkg.version}
      shops={shops}
      familyName={familyName}
    />
  );
}
