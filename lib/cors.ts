/**
 * CORS for browser clients (e.g. Flutter web on localhost calling https://api).
 * Next.js middleware headers do not always merge onto Route Handler responses — apply here too.
 */
import { NextRequest, NextResponse } from 'next/server';

export function getCorsAllowedOrigin(req: NextRequest): string | null {
  const origin = req.headers.get('origin');
  if (!origin) return null;
  try {
    const u = new URL(origin);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return origin;
    const authUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
    if (authUrl) {
      const app = new URL(authUrl);
      if (u.origin === app.origin) return origin;
    }
    if (u.hostname === 'scriptme.id' || u.hostname.endsWith('.scriptme.id')) return origin;
  } catch {
    return null;
  }
  return null;
}

export function corsHeadersForOrigin(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, Cookie, X-Requested-With',
  };
}

export function applyCorsHeaders(req: NextRequest, res: NextResponse): void {
  const origin = getCorsAllowedOrigin(req);
  if (!origin) return;
  const h = corsHeadersForOrigin(origin);
  for (const [k, v] of Object.entries(h)) {
    res.headers.set(k, v);
  }
}

/** JSON response with CORS headers (Flutter web + credentials). */
export function jsonWithCors(req: NextRequest, data: unknown, init?: ResponseInit): NextResponse {
  const res = NextResponse.json(data, init);
  applyCorsHeaders(req, res);
  return res;
}

export function handleCorsPreflight(req: NextRequest): NextResponse {
  const origin = getCorsAllowedOrigin(req);
  if (!origin) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, { status: 204, headers: corsHeadersForOrigin(origin) });
}
