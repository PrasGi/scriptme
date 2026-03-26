import type { NextRequest } from 'next/server';

/**
 * Flutter web on localhost calling https://scriptme.cloud often cannot persist HttpOnly cookies (third-party
 * blocking). Clients may send `Authorization: Bearer <jwt>` instead; merge into `Cookie` so `getToken` / `auth()`
 * behave like a normal session. Value matches what mobile login sets (raw JWT, same as Set-Cookie).
 */
export function mergeBearerIntoCookieHeaders(req: NextRequest): Headers {
  const out = new Headers(req.headers);
  if (!req.nextUrl.pathname.startsWith('/api/')) return out;
  const authz = out.get('authorization');
  if (!authz?.startsWith('Bearer ')) return out;
  const token = authz.slice(7).trim();
  if (!token) return out;
  const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith('https://') ?? true;
  const cookieName = useSecureCookies ? '__Secure-authjs.session-token' : 'authjs.session-token';
  const existing = out.get('cookie') ?? '';
  if (existing.includes(`${cookieName}=`)) return out;
  out.set('cookie', existing ? `${existing}; ${cookieName}=${token}` : `${cookieName}=${token}`);
  return out;
}
