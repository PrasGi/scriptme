/**
 * POST /api/usage/record
 * Record usage for a limit-counted action (e.g. read_mode). Check limit first, then increment.
 * Body: { action: 'read_mode' }
 */
import { getAuthSession } from '@/lib/auth-session';
import { unauthorized, badRequest, forbidden, ok, serverError } from '@/lib/response';
import { checkActionLimit, incrementActionUsage, type PlanActionName } from '@/lib/subscription';

const ALLOWED_ACTIONS: PlanActionName[] = ['read_mode'];

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  let body: { action?: string };
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    return badRequest('Invalid JSON body');
  }

  const action = body.action;
  if (!action || typeof action !== 'string' || !ALLOWED_ACTIONS.includes(action as PlanActionName)) {
    return badRequest('action must be one of: ' + ALLOWED_ACTIONS.join(', '));
  }

  const limitCheck = await checkActionLimit(session.user.id, action as PlanActionName);
  if (!limitCheck.allowed) {
    return forbidden('Monthly limit for ' + action + ' reached. Upgrade or wait until next month.');
  }

  await incrementActionUsage(session.user.id, action as PlanActionName);
  return ok('Usage recorded');
}
