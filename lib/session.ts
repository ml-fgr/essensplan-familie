import { getIronSession, IronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  authenticated: boolean;
}

const COOKIE_NAME = 'essensplan_sid';
const SECRET = process.env.SESSION_SECRET || 'fallback-secret-change-me-please!!';

function makeOptions(remember: boolean) {
  return {
    password: SECRET,
    cookieName: COOKIE_NAME,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: remember
        ? 60 * 60 * 24 * 60  // 2 Monate
        : 60 * 60 * 24 * 7,  // 7 Tage
    },
  };
}

export async function getSession(remember = false): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, makeOptions(remember));
}
