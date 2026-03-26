/**
 * POST /api/admin/users/[id]/grant-subscription
 * Admin — grant subscription to user (months or days).
 * Body: { planId, months?, days? }
 */
import { getAuthSession } from '@/lib/auth-session';
import { unauthorized, forbidden, badRequest, ok, notFound, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import User from '@/models/user.model';
import Plan from '@/models/plan.model';
import { grantSubscription } from '@/lib/subscription';
import { Types } from 'mongoose';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();
  const perms = (session.user as { permissions?: string[] }).permissions ?? [];
  if (!perms.includes('role:read:all')) return forbidden('Admin required');

  const { id: userId } = await params;
  let body: { planId?: string; months?: number; days?: number };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { planId, months, days } = body;
  if (!planId || typeof planId !== 'string') return badRequest('planId is required');
  const duration = months != null ? Number(months) : days != null ? Number(days) : null;
  if (duration == null || duration <= 0) return badRequest('months or days (positive) is required');

  try {
    await connectDB();
    const user = await User.findById(userId).lean();
    if (!user) return notFound('User not found');
    const plan = await Plan.findById(planId).lean();
    if (!plan) return notFound('Plan not found');

    const durationDays = months != null ? months * 30 : Math.min(days ?? 30, 365 * 2);

    await grantSubscription(userId, planId, durationDays, 'admin_grant');

    return ok('Subscription granted');
  } catch (err) {
    return serverError(err);
  }
}
