import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/login', '/robots.txt', '/_next', '/favicon.ico'];

// Middleware läuft im Edge-Runtime: kein Node.js crypto verfügbar.
// Wir prüfen nur ob der Session-Cookie existiert — die echte Verifikation
// (iron-session unseal) findet in den API-Routen und Server-Komponenten statt.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const hasCookie = !!req.cookies.get('essensplan_sid')?.value;
  if (!hasCookie) {
    const rawHost = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
    const host = rawHost.split(',')[0].trim();
    const proto = req.headers.get('x-forwarded-proto') || 'https';
    return NextResponse.redirect(`${proto}://${host}/login`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
