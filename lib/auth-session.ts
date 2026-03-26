import { decode } from '@auth/core/jwt';
import { headers } from 'next/headers';
import { getToken } from 'next-auth/jwt';
import type { Session } from 'next-auth';
import type { NextRequest } from 'next/server';
import { NextRequest as NextRequestCtor } from 'next/server';

import { auth } from '@/auth';
import { mergeBearerIntoCookieHeaders } from '@/lib/bearer-session-cookie';

/** Must match `encode` / `getToken` in mobile login and NextAuth JWT. */
const AUTH_SALT = 'authjs.session-token';

/**
 * Same as `auth()` but resolves the session when the client sends `Authorization: Bearer` (Flutter web).
 *
 * We decode the JWT with `@auth/core/jwt` `decode` first — **do not** rely on building a fake
 * `NextRequest` from `headers()` for `getToken`: `ReadonlyHeaders` is not always copied correctly
 * into `NextRequest`, so `mergeBearerIntoCookieHeaders` never saw `Authorization` and `getToken` stayed empty.
 */
export async function getAuthSession(): Promise<Session | null> {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  const h = await headers();

  // #region agent log
  const authzPresent = Boolean(h.get('authorization') ?? h.get('Authorization'));
  fetch('http://127.0.0.1:7444/ingest/c52b058c-998f-46c8-a602-4c73a0ed7fc0', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'dd82dd' },
    body: JSON.stringify({
      sessionId: 'dd82dd',
      location: 'lib/auth-session.ts:getAuthSession',
      message: 'headers snapshot',
      data: { authzPresent, hypothesisId: 'H-bearer-decode' },
      timestamp: Date.now(),
      hypothesisId: 'H-bearer-decode',
    }),
  }).catch(() => {});
  // #endregion

  if (secret) {
    const authz = h.get('authorization') ?? h.get('Authorization');
    if (authz?.startsWith('Bearer ')) {
      const raw = authz.slice(7).trim();
      if (raw) {
        try {
          const payload = await decode({
            token: raw,
            secret,
            salt: AUTH_SALT,
          });
          if (payload && (payload.sub || payload.id)) {
            const id = String((payload.id as string | undefined) ?? payload.sub);
            return {
              user: {
                id,
                name: (payload.name as string) ?? '',
                email: (payload.email as string) ?? '',
                image: (payload.picture as string | null) ?? null,
                roleId: (payload.roleId as string) ?? '',
                roleName: (payload.roleName as string) ?? '',
                permissions: (payload.permissions as string[]) ?? [],
              },
              expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            };
          }
        } catch (e) {
          // #region agent log
          fetch('http://127.0.0.1:7444/ingest/c52b058c-998f-46c8-a602-4c73a0ed7fc0', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'dd82dd' },
            body: JSON.stringify({
              sessionId: 'dd82dd',
              location: 'lib/auth-session.ts:decode',
              message: 'Bearer JWT decode threw',
              data: {
                err: e instanceof Error ? e.message : 'unknown',
                hypothesisId: 'H-decode',
              },
              timestamp: Date.now(),
              hypothesisId: 'H-decode',
            }),
          }).catch(() => {});
          // #endregion
          /* fall through to getToken / auth */
        }
      }
    }
  }

  const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith('https://') ?? true;
  const out = new Headers();
  h.forEach((value, key) => {
    out.set(key, value);
  });
  const req = new NextRequestCtor(new URL('https://internal/api/_'), { headers: out });
  const merged = mergeBearerIntoCookieHeaders(req);

  if (secret) {
    /** Mobile `/api/mobile/*` uses `encode({ salt: 'authjs.session-token' })`; NextAuth web uses salt = cookie name (`__Secure-…` when HTTPS). */
    let token =
      (await getToken({
        req: { headers: merged } as NextRequest,
        secret,
        secureCookie: useSecureCookies,
        salt: AUTH_SALT,
      })) ?? (await getToken({
        req: { headers: merged } as NextRequest,
        secret,
        secureCookie: useSecureCookies,
      }));
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
