/**
 * lib/subscription.ts
 * Subscription and plan helpers: get active subscription, effective plan, token limits, feature access.
 */

import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import Plan from '@/models/plan.model';
import Subscription from '@/models/subscription.model';
import User from '@/models/user.model';
import AiChatLog from '@/models/ai-chat-log.model';
import type { IPlan } from '@/models/plan.model';
import type { ISubscription } from '@/models/subscription.model';

export interface TokenUsageResult {
  allowed: boolean;
  used: number;
  limit: number | null;
}

/** Get active subscription for user (endsAt > now). */
export async function getUserSubscription(userId: string | Types.ObjectId): Promise<ISubscription | null> {
  await connectDB();
  const sub = await Subscription.findOne({
    userId: new Types.ObjectId(userId as string),
    endsAt: { $gt: new Date() },
  })
    .sort({ endsAt: -1 })
    .limit(1)
    .populate('planId')
    .lean();
  return sub as unknown as ISubscription | null;
}

/** Get effective plan for user: subscription plan, or user.planId, or default Starter. */
export async function getEffectivePlan(userId: string | Types.ObjectId): Promise<IPlan | null> {
  await connectDB();
  const sub = await getUserSubscription(userId);
  if (sub?.planId) {
    return sub.planId as unknown as IPlan;
  }
  const user = await User.findById(userId).select('planId').lean();
  if (user?.planId) {
    const plan = await Plan.findById(user.planId).lean();
    return plan as unknown as IPlan | null;
  }
  const starter = await Plan.findOne({ slug: 'starter', isActive: true }).lean();
  return starter as unknown as IPlan | null;
}

/** Get start of current month (UTC) for billing period. */
function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

/** Check token limit: aggregate AiChatLog for current month. */
export async function checkTokenLimit(
  userId: string | Types.ObjectId,
  plan: IPlan | null,
  estimatedTokens = 30_000
): Promise<TokenUsageResult> {
  await connectDB();
  if (!plan?.tokenLimitMonthly) {
    return { allowed: true, used: 0, limit: null };
  }

  const startOfMonth = startOfCurrentMonth();
  const agg = await AiChatLog.aggregate<{ total: number }>([
    {
      $match: {
        userId: new Types.ObjectId(userId as string),
        createdAt: { $gte: startOfMonth },
      },
    },
    { $group: { _id: null, total: { $sum: { $ifNull: ['$totalTokens', 0] } } } },
  ]);
  const used = agg[0]?.total ?? 0;
  const allowed = used + estimatedTokens <= plan.tokenLimitMonthly;

  return {
    allowed,
    used,
    limit: plan.tokenLimitMonthly,
  };
}

/** Feature flags per plan slug. Starter gets basic features, Creator gets all, Enterprise gets all. */
const FEATURES_BY_PLAN: Record<string, string[]> = {
  starter:   ['generate', 'analyze', 'regenerate', 'chat', 'clone'],
  creator:   ['generate', 'analyze', 'regenerate', 'chat', 'clone'],
  enterprise: ['generate', 'analyze', 'regenerate', 'chat', 'clone'],
};

/** Check if user's plan allows the feature. */
export async function checkFeatureAccess(
  userId: string | Types.ObjectId,
  feature: string
): Promise<boolean> {
  const plan = await getEffectivePlan(userId);
  if (!plan) return false;
  const features = FEATURES_BY_PLAN[plan.slug] ?? [];
  return features.includes(feature);
}

/** Grant subscription to user (admin or purchase flow). Extends existing subscription if same plan and source is purchase. */
export async function grantSubscription(
  userId: string | Types.ObjectId,
  planId: string | Types.ObjectId,
  durationDays: number,
  source: 'trial' | 'purchase' | 'admin_grant',
  transactionId?: string | Types.ObjectId
): Promise<ISubscription> {
  await connectDB();
  const uid = new Types.ObjectId(userId as string);
  const pid = new Types.ObjectId(planId as string);

  // If purchase and user has active subscription for same plan, extend it
  const existing = await Subscription.findOne({
    userId: uid,
    planId: pid,
    endsAt: { $gt: new Date() },
  })
    .sort({ endsAt: -1 })
    .limit(1);

  if (existing && source === 'purchase') {
    const newEndsAt = new Date(existing.endsAt);
    newEndsAt.setDate(newEndsAt.getDate() + durationDays);
    await Subscription.findByIdAndUpdate(existing._id, { $set: { endsAt: newEndsAt } });
    const updated = await Subscription.findById(existing._id);
    return updated!;
  }

  const startedAt = new Date();
  const endsAt = new Date(startedAt);
  endsAt.setDate(endsAt.getDate() + durationDays);

  const sub = await Subscription.create({
    userId: uid,
    planId: pid,
    startedAt,
    endsAt,
    source,
    transactionId: transactionId ? new Types.ObjectId(transactionId as string) : null,
  });

  await User.findByIdAndUpdate(uid, {
    planId: pid,
    subscriptionId: sub._id,
  });

  return sub;
}
