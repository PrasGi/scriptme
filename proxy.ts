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

export async function proxy(req: NextRequest) {
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

  // getToken uses Web Crypto API — Edge Runtime compatible
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET!,
  });

  if (!token) {
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
        // Redirect to dashboard with a forbidden flag
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
    /*
     * Match all request paths EXCEPT:
     * - _next/static
     * - _next/image
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
