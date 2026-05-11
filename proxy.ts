import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';

const PUBLIC_PATHS = ['/login', '/api/login', '/robots.txt', '/_next', '/favicon.ico'];

export async function proxy(req: NextRequest) {
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
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
