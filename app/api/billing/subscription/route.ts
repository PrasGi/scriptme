/**
 * GET /api/billing/subscription
 * Returns current subscription and effective plan for the user.
 */
import { getAuthSession } from '@/lib/auth-session';
import { unauthorized, ok, serverError } from '@/lib/response';
import { getUserSubscription, getEffectivePlan } from '@/lib/subscription';
import { connectDB } from '@/lib/db';

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  try {
    await connectDB();
    const [sub, plan] = await Promise.all([
      getUserSubscription(session.user.id),
      getEffectivePlan(session.user.id),
    ]);
    return ok('Subscription fetched', {
      subscription: sub ? {
        _id: sub._id,
        planId: (sub as unknown as { planId: { _id: string } }).planId?._id ?? sub.planId,
        startedAt: (sub as unknown as { startedAt: Date }).startedAt,
        endsAt: (sub as unknown as { endsAt: Date }).endsAt,
        source: (sub as unknown as { source: string }).source,
      } : null,
      plan: plan ? {
        _id: plan._id,
        name: (plan as unknown as { name: string }).name,
        slug: (plan as unknown as { slug: string }).slug,
        priceMonthly: (plan as unknown as { priceMonthly: number | null }).priceMonthly,
        tokenLimitMonthly: (plan as unknown as { tokenLimitMonthly: number | null }).tokenLimitMonthly,
        features: (plan as unknown as { features: string[] }).features,
      } : null,
    });
  } catch (err) {
    return serverError(err);
  }
}
