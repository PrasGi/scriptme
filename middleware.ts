/**
 * Next.js middleware: protect routes, CORS for /api (Flutter web + browser clients),
 * and redirect unauthenticated users to /login for pages.
 */
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { mergeBearerIntoCookieHeaders } from '@/lib/bearer-session-cookie';
import {
  applyCorsHeaders,
  corsHeadersForOrigin,
  getCorsAllowedOrigin,
} from '@/lib/cors';

const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password'];

/** Routes that require a specific permission to access */
const PERMISSION_GUARDED: Array<{ prefix: string; permission: string }> = [
  { prefix: '/admin/users', permission: 'user:read:all' },
  { prefix: '/admin/iam', permission: 'role:read:all' },
  { prefix: '/admin/transcript-test', permission: 'role:read:all' },
];

function withCors(res: NextResponse, req: NextRequest): NextResponse {
  applyCorsHeaders(req, res);
  return res;
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const mergedHeaders = mergeBearerIntoCookieHeaders(req);

  // Browser CORS preflight for API (e.g. Flutter web on localhost → HTTPS API)
  if (pathname.startsWith('/api/') && req.method === 'OPTIONS') {
    const origin = getCorsAllowedOrigin(req);
    if (!origin) {
      return new NextResponse(null, { status: 403 });
    }
    return new NextResponse(null, { status: 204, headers: corsHeadersForOrigin(origin) });
  }

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/mobile') ||
    pathname === '/api/health' ||
    pathname === '/api/plans' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/public') ||
    pathname.includes('.');

  if (isPublic) {
    const res = NextResponse.next({ request: { headers: mergedHeaders } });
    return pathname.startsWith('/api/') ? withCors(res, req) : res;
  }

  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith('https://') ?? true;
  // getToken only reads headers; avoid `new NextRequest(...)` here — it breaks Next 16 / next-auth typings in CI.
  const token = await getToken({
    req: { headers: mergedHeaders } as NextRequest,
    secret: secret!,
    secureCookie: useSecureCookies,
  });

  if (!token) {
    if (pathname.startsWith('/api/')) {
      const res = NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
      return withCors(res, req);
    }
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const permissions = (token.permissions as string[]) ?? [];
  for (const guard of PERMISSION_GUARDED) {
    if (pathname.startsWith(guard.prefix)) {
      const [resource, action, scope] = guard.permission.split(':');
      const hasPermission =
        permissions.includes(guard.permission) ||
        (scope === 'own' && permissions.includes(`${resource}:${action}:all`));

      if (!hasPermission) {
        if (pathname.startsWith('/api/')) {
          const res = NextResponse.json(
            { success: false, message: 'Forbidden' },
            { status: 403 }
          );
          return withCors(res, req);
        }
        const dashboardUrl = new URL('/dashboard', req.url);
        dashboardUrl.searchParams.set('error', 'forbidden');
        return NextResponse.redirect(dashboardUrl);
      }
    }
  }

  const res = NextResponse.next({ request: { headers: mergedHeaders } });
  return pathname.startsWith('/api/') ? withCors(res, req) : res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
