/**
 * lib/subscription.ts
 * Subscription and plan helpers: get active subscription, effective plan, token limits, feature access.
 */

import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import Plan from '@/models/plan.model';
import PlanActionUsage from '@/models/plan-action-usage.model';
import Script from '@/models/script.model';
import Subscription from '@/models/subscription.model';
import User from '@/models/user.model';
import AiChatLog from '@/models/ai-chat-log.model';
import type { IPlan } from '@/models/plan.model';
import type { ISubscription } from '@/models/subscription.model';

export type PlanActionName =
  | 'project_create'
  | 'save'
  | 'export'
  | 'analyze'
  | 'fetch'
  | 'read_mode'
  | 'character_create';

export interface ActionLimitResult {
  allowed: boolean;
  used: number;
  limit: number | null;
}

const PLAN_LIMIT_KEYS: Record<PlanActionName, keyof IPlan> = {
  project_create:  'limitProjectCreate',
  save:             'limitSave',
  export:           'limitExport',
  analyze:          'limitAnalyze',
  fetch:            'limitFetch',
  read_mode:        'limitReadMode',
  character_create: 'limitCharacterCreate',
};

/** Usage doc field names (export is reserved in JS so we use exportCount in schema). */
const USAGE_FIELDS: Record<PlanActionName, string> = {
  project_create:  'project_create',
  save:             'save',
  export:           'exportCount',
  analyze:          'analyze',
  fetch:            'fetch',
  read_mode:        'read_mode',
  character_create: 'character_create',
};

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
  if (sub?.planId) return sub.planId as unknown as IPlan;
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

/** Current billing period string "YYYY-MM" (UTC). */
function getPeriodString(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** Fallback limits for Starter when DB has null (e.g. plan created before limits existed). */
const DEFAULT_STARTER_LIMITS: Record<PlanActionName, number> = {
  project_create:  5,
  save:            2,
  export:          10,
  analyze:         5,
  fetch:            3,
  read_mode:       10,
  character_create: 5,
};

/** Get plan's limit for an action (null = unlimited). */
export function getActionLimit(plan: IPlan | null, action: PlanActionName): number | null {
  if (!plan) return null;
  const key = PLAN_LIMIT_KEYS[action];
  const val = (plan as unknown as Record<string, unknown>)[key];
  if (val != null && typeof val === 'number') return val;
  if (plan.slug === 'starter') return DEFAULT_STARTER_LIMITS[action];
  return null;
}

/** Start/end of month (UTC) from period string "YYYY-MM". */
function periodToRange(period: string): { start: Date; end: Date } {
  const [y, m] = period.split('-').map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0)),
    end:   new Date(Date.UTC(y, m, 1, 0, 0, 0, 0)),
  };
}

/** Get current usage count for user/period/action. For 'save', returns actual count of non-deleted scripts created this month. */
export async function getActionUsage(
  userId: string | Types.ObjectId,
  period: string,
  action: PlanActionName
): Promise<number> {
  await connectDB();
  const uid = new Types.ObjectId(userId as string);

  if (action === 'save') {
    const { start, end } = periodToRange(period);
    return Script.countDocuments({
      userId: uid,
      createdAt: { $gte: start, $lt: end },
      deletedAt: null,
    });
  }

  const doc = await PlanActionUsage.findOne(
    { userId: uid, period },
    { [USAGE_FIELDS[action]]: 1 }
  ).lean();
  if (!doc) return 0;
  const field = USAGE_FIELDS[action];
  const val = (doc as unknown as Record<string, number>)[field];
  return typeof val === 'number' ? val : 0;
}

/** Check if user is within plan limit for the action. */
export async function checkActionLimit(
  userId: string | Types.ObjectId,
  action: PlanActionName
): Promise<ActionLimitResult> {
  const plan = await getEffectivePlan(userId);
  const limit = getActionLimit(plan, action);
  const period = getPeriodString();
  const used = await getActionUsage(userId, period, action);

  if (limit == null) {
    return { allowed: true, used, limit: null };
  }
  return {
    allowed: used < limit,
    used,
    limit,
  };
}

/** Increment usage for user/action in current period (call after successful action). */
export async function incrementActionUsage(
  userId: string | Types.ObjectId,
  action: PlanActionName
): Promise<void> {
  await connectDB();
  const period = getPeriodString();
  const field = USAGE_FIELDS[action];
  await PlanActionUsage.findOneAndUpdate(
    { userId: new Types.ObjectId(userId as string), period },
    { $inc: { [field]: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
}

/** Decrement usage for user/action in current period (e.g. when a script is deleted). Floors at 0. */
export async function decrementActionUsage(
  userId: string | Types.ObjectId,
  action: PlanActionName,
  amount = 1
): Promise<void> {
  if (amount <= 0) return;
  await connectDB();
  const period = getPeriodString();
  const field = USAGE_FIELDS[action];
  const doc = await PlanActionUsage.findOne({
    userId: new Types.ObjectId(userId as string),
    period,
  }).select(field).lean();
  const current = (doc as Record<string, number> | null)?.[field] ?? 0;
  const next = Math.max(0, current - amount);
  await PlanActionUsage.updateOne(
    { userId: new Types.ObjectId(userId as string), period },
    { $set: { [field]: next } }
  );
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
