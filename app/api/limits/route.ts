/**
 * GET /api/limits
 * Returns current user's action limit status for actions that the UI needs (e.g. create script).
 */
import { getAuthSession } from '@/lib/auth-session';
import { ok, unauthorized, serverError } from '@/lib/response';
import { checkActionLimit } from '@/lib/subscription';

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  try {
    const save = await checkActionLimit(session.user.id, 'save');
    return ok('Limits', {
      save: { allowed: save.allowed, used: save.used, limit: save.limit },
    });
  } catch (err) {
    return serverError(err);
  }
}
