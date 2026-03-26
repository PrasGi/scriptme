/**
 * CORS for browser clients (e.g. Flutter web on localhost calling https://api).
 * Next.js middleware headers do not always merge onto Route Handler responses — apply here too.
 */
import { NextRequest, NextResponse } from 'next/server';

/** Optional comma-separated full origins (e.g. `https://app.example.com`) for Flutter web or extra domains on your VPS. */
const EXTRA_CORS_ORIGINS = new Set(
  (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

/** RFC1918 + loopback — Flutter web often uses http://192.168.x.x:port or http://10.0.2.2 (Android emulator). */
function isPrivateOrLocalIPv4(hostname: string): boolean {
  const parts = hostname.split('.');
  if (parts.length !== 4) return false;
  const n = parts.map((p) => Number(p));
  if (n.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return false;
  const [a, b] = n;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

export function getCorsAllowedOrigin(req: NextRequest): string | null {
  const origin = req.headers.get('origin');
  if (!origin) return null;
  try {
    const u = new URL(origin);
    if (EXTRA_CORS_ORIGINS.has(origin)) return origin;
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return origin;
    if (isPrivateOrLocalIPv4(u.hostname)) return origin;
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
