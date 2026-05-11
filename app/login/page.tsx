import { getDb } from '@/lib/db';
import LoginClient from './LoginClient';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const db = getDb();
  const row = db.prepare('SELECT family_name FROM settings WHERE id = 1').get() as
    { family_name: string | null } | undefined;
  const familyName = row?.family_name ?? '';

  return <LoginClient familyName={familyName} />;
}
