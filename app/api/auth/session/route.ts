/**
 * GET /api/auth/session — same data as NextAuth, with explicit CORS for Flutter web
 * (cross-origin requests do not always receive headers merged from middleware alone).
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { agentDebugLog } from '@/lib/agent-debug-log';
import { applyCorsHeaders, handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(req: NextRequest) {
  return handleCorsPreflight(req);
}

export async function GET(req: NextRequest) {
  // #region agent log
  const cookieHeader = req.headers.get('cookie') ?? '';
  const origin = req.headers.get('origin');
  // #endregion
  const session = await auth();
  // #region agent log
  const userId = session?.user?.id;
  agentDebugLog(
    'app/api/auth/session/route.ts:GET',
    'session after auth()',
    {
      cookieHeaderLength: cookieHeader.length,
      origin: origin ?? '(none)',
      hasUserId: Boolean(userId),
    },
    'H1'
  );
  // #endregion
  const body = session ?? {};
  const res = NextResponse.json(body);
  applyCorsHeaders(req, res);
  return res;
}
