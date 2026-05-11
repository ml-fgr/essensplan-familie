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
    // X-Forwarded-Host nutzen falls hinter einem Proxy (Apache)
    const forwardedHost = req.headers.get('x-forwarded-host');
    const host = forwardedHost || req.headers.get('host') || '';
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    return NextResponse.redirect(`${proto}://${host}/login`);
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
