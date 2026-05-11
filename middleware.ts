import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';

const PUBLIC_PATHS = ['/login', '/api/login', '/robots.txt', '/_next', '/favicon.ico'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const session = await getIronSession<{ authenticated?: boolean }>(req, res, {
    password: process.env.SESSION_SECRET || 'fallback-secret-change-me-please!!',
    cookieName: 'essensplan_sid',
  });

  if (!session.authenticated) {
    // X-Forwarded-Host kann mehrere Werte haben (Apache setzt ihn ggf. doppelt)
    const rawHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
    const host = rawHost.split(',')[0].trim();
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    return NextResponse.redirect(`${proto}://${host}/login`);
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
