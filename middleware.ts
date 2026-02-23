/**
 * Next.js middleware: protect routes and redirect unauthenticated users to /login.
 */
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/register', '/forgot-password'];

/** Routes that require a specific permission to access */
const PERMISSION_GUARDED: Array<{ prefix: string; permission: string }> = [
  { prefix: '/admin/users',           permission: 'user:read:all' },
  { prefix: '/admin/iam',             permission: 'role:read:all' },
  { prefix: '/admin/transcript-test', permission: 'role:read:all' },
];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public pages, static files, NextAuth API routes, and public APIs (e.g. plans for LP)
  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/api/auth') ||
    pathname === '/api/plans' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/public') ||
    pathname.includes('.');

  if (isPublic) return NextResponse.next();

  // getToken must use same cookie name as Auth.js: __Secure-authjs.session-token when NEXTAUTH_URL is https
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith('https://') ?? true;
  const token = await getToken({
    req,
    secret: secret!,
    secureCookie: useSecureCookies,
  });

  if (!token) {
    // #region agent log — debug why /dashboard request has no session (cookie not set vs getToken failing)
    const cookieNames = req.cookies.getAll().map((c) => c.name);
    const hasAuthCookie = cookieNames.some(
      (n) => n.includes('authjs') || n.includes('next-auth') || n.includes('session')
    );
    console.log(
      JSON.stringify({
        sessionId: '4d1c77',
        location: 'middleware.ts:redirect to login',
        message: 'no token',
        data: { pathname, hasAuthCookie, cookieCount: cookieNames.length, cookieNames },
        hypothesisId: 'cookie-or-secret',
      })
    );
    // #endregion
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check permission-guarded routes
  const permissions = (token.permissions as string[]) ?? [];
  for (const guard of PERMISSION_GUARDED) {
    if (pathname.startsWith(guard.prefix)) {
      const [resource, action, scope] = guard.permission.split(':');
      const hasPermission =
        permissions.includes(guard.permission) ||
        (scope === 'own' && permissions.includes(`${resource}:${action}:all`));

      if (!hasPermission) {
        const dashboardUrl = new URL('/dashboard', req.url);
        dashboardUrl.searchParams.set('error', 'forbidden');
        return NextResponse.redirect(dashboardUrl);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
