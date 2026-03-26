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
  const body = session ?? {};
  const res = NextResponse.json(body);
  applyCorsHeaders(req, res);
  return res;
}
