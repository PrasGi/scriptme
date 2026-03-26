import { getAuthSession } from '@/lib/auth-session';
import { unauthorized, created, serverError } from '@/lib/response';
import { createAiSession } from '@/lib/ai-agent';
import { randomUUID } from 'crypto';

/**
 * POST /api/ai/session
 * Creates a new ADK in-memory session for the authenticated user.
 * Returns a sessionId the client uses for all subsequent /api/ai/chat calls.
 */
export async function POST() {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  try {
    const sessionId = randomUUID();
    createAiSession(session.user.id, sessionId);
    return created('Session created', { sessionId });
  } catch (err) {
    return serverError(err);
  }
}
