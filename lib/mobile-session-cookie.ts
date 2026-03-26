import type { NextRequest } from 'next/server';

/**
 * Flutter web on `http://localhost:*` calling `https://scriptme.cloud` is **cross-site** (different hostnames).
 * `SameSite=Lax` does not attach the session cookie on credentialed fetch to another site; use `none` + `Secure`.
 * Native clients usually omit `Origin` → keep default `lax`.
 */
export function needsSameSiteNoneForCredentialSharing(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  try {
    const o = new URL(origin);
    const api = new URL(req.url);
    return o.hostname !== api.hostname;
  } catch {
    return false;
  }
}

/**
 * Whether to emit `__Secure-authjs.session-token` + `Secure` flag (must align with Auth.js `useSecureCookies`).
 *
 * Bug: `NEXTAUTH_URL?.startsWith('https://') ?? production` yields **false** when `NEXTAUTH_URL` is
 * `http://localhost...` (`false` is not nullish), so production behind HTTPS could set the wrong cookie name.
 * Also trust `X-Forwarded-Proto` from nginx / reverse proxy.
 */
export function useSecureSessionCookies(req: NextRequest): boolean {
  const authUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL;
  if (authUrl?.startsWith('https://')) return true;
  if (authUrl?.startsWith('http://')) {
    const forwarded = req.headers.get('x-forwarded-proto');
    if (forwarded === 'https') return true;
    if (req.nextUrl.protocol === 'https:') return true;
    return false;
  }
  const forwarded = req.headers.get('x-forwarded-proto');
  if (forwarded === 'https') return true;
  if (req.nextUrl.protocol === 'https:') return true;
  return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
}
