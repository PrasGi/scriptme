/**
 * GET /api/billing/usage
 * Returns token usage for current billing period (month).
 */
import { auth } from '@/auth';
import { unauthorized, ok, serverError } from '@/lib/response';
import { getEffectivePlan, checkTokenLimit } from '@/lib/subscription';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  try {
    const plan = await getEffectivePlan(session.user.id);
    const { used, limit } = await checkTokenLimit(session.user.id, plan, 0);
    return ok('Usage fetched', { used, limit });
  } catch (err) {
    return serverError(err);
  }
}
