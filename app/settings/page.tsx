import { getDb } from '@/lib/db';
import SettingsClient from './SettingsClient';
import pkg from '../../package.json';

function todayISO() { return new Date().toISOString().split('T')[0]; }

export default function SettingsPage() {
  const db = getDb();
  const row = db.prepare('SELECT city, zip_codes, shopping_date FROM settings WHERE id = 1').get() as
    { city: string; zip_codes: string; shopping_date: string | null } | undefined;

  const city = row?.city ?? '';
  const zipCount = row ? (JSON.parse(row.zip_codes) as string[]).length : 0;
  const shoppingDate = row?.shopping_date ?? todayISO();

  return (
    <SettingsClient
      city={city}
      zipCount={zipCount}
      shoppingDate={shoppingDate}
      localVersion={pkg.version}
    />
  );
}
