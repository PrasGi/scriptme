import { headers } from 'next/headers';
import { getToken } from 'next-auth/jwt';
import type { Session } from 'next-auth';
import type { NextRequest } from 'next/server';
import { NextRequest as NextRequestCtor } from 'next/server';

import { auth } from '@/auth';
import { mergeBearerIntoCookieHeaders } from '@/lib/bearer-session-cookie';

/**
 * Same as `auth()` but resolves JWT when the client sends `Authorization: Bearer` (Flutter web)
 * and `cookies()` does not see the merged session cookie. Use in Route Handlers instead of `auth()`.
 */
export async function getAuthSession(): Promise<Session | null> {
  const h = await headers();
  const req = new NextRequestCtor(new URL('https://internal/api/_'), { headers: h });
  const merged = mergeBearerIntoCookieHeaders(req);
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith('https://') ?? true;

  if (secret) {
    const token = await getToken({
      req: { headers: merged } as NextRequest,
      secret,
      secureCookie: useSecureCookies,
    });
    if (token && (token.sub || token.id)) {
      const id = String((token.id as string | undefined) ?? token.sub);
      return {
        user: {
          id,
          name: token.name as string,
          email: token.email as string,
          image: (token.picture as string | null) ?? null,
          roleId: token.roleId as string,
          roleName: token.roleName as string,
          permissions: (token.permissions as string[]) ?? [],
        },
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }
  }

  return auth();
}
