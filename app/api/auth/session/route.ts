/**
 * GET /api/auth/session — same data as NextAuth, with explicit CORS for Flutter web
 * (cross-origin requests do not always receive headers merged from middleware alone).
 *
 * Uses `getAuthSession()` so Flutter web `Authorization: Bearer` works (see `@/lib/auth-session`).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth-session';
import { applyCorsHeaders, handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreflight(req);
}

export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  const rawCookie = req.headers.get('cookie');
  const cookieHeaderLen = rawCookie?.length ?? 0;
  const hasUser = Boolean(session?.user?.id);

  // #region agent log
  fetch('http://127.0.0.1:7444/ingest/c52b058c-998f-46c8-a602-4c73a0ed7fc0', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'dd82dd' },
    body: JSON.stringify({
      sessionId: 'dd82dd',
      location: 'app/api/auth/session/route.ts:GET',
      message: 'session GET',
      data: {
        cookieHeaderLen,
        hasUser,
        resolvedVia: 'getAuthSession',
        origin: req.headers.get('origin') ?? '',
        hypothesisId: 'H1',
      },
      timestamp: Date.now(),
      hypothesisId: 'H1',
    }),
  }).catch(() => {});
  // #endregion

  const body = session ?? {};
  const res = NextResponse.json(body);
  applyCorsHeaders(req, res);
  return res;
}
