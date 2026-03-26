/**
 * GET /api/admin/plans
 * Admin — list all plans.
 * POST /api/admin/plans
 * Admin — create plan.
 */
import { getAuthSession } from '@/lib/auth-session';
import { unauthorized, forbidden, badRequest, created, ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Plan from '@/models/plan.model';

export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();
  const perms = (session.user as { permissions?: string[] }).permissions ?? [];
  if (!perms.includes('role:read:all')) return forbidden('Admin required');

  try {
    await connectDB();
    const plans = await Plan.find().sort({ order: 1 }).lean();
    return ok('Plans fetched', plans);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();
  const perms = (session.user as { permissions?: string[] }).permissions ?? [];
  if (!perms.includes('role:read:all')) return forbidden('Admin required');

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const {
    name,
    slug,
    priceMonthly,
    discount1Month = 0,
    discount3Months = 0,
    discount6Months = 0,
    tokenLimitMonthly,
    features = [],
    cta,
    badge,
    isActive = true,
    order = 0,
    limitProjectCreate,
    limitSave,
    limitExport,
    limitAnalyze,
    limitFetch,
    limitReadMode,
    limitCharacterCreate,
    showFeaturesToUser = true,
  } = body as Record<string, unknown>;

  if (!name || typeof name !== 'string' || !slug || typeof slug !== 'string' || !cta || typeof cta !== 'string') {
    return badRequest('name, slug, and cta are required');
  }

  function limitVal(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  try {
    await connectDB();
    const plan = await Plan.create({
      name: name.trim(),
      slug: String(slug).trim().toLowerCase(),
      priceMonthly: typeof priceMonthly === 'number' ? priceMonthly : priceMonthly === null ? null : 0,
      discount1Month: Number(discount1Month) || 0,
      discount3Months: Number(discount3Months) || 0,
      discount6Months: Number(discount6Months) || 0,
      tokenLimitMonthly: typeof tokenLimitMonthly === 'number' ? tokenLimitMonthly : tokenLimitMonthly === null ? null : null,
      features: Array.isArray(features) ? features.map(String) : [],
      cta: cta.trim(),
      badge: badge != null ? String(badge) : null,
      isActive: Boolean(isActive),
      order: Number(order) || 0,
      showFeaturesToUser: Boolean(showFeaturesToUser),
      limitProjectCreate: limitVal(limitProjectCreate),
      limitSave: limitVal(limitSave),
      limitExport: limitVal(limitExport),
      limitAnalyze: limitVal(limitAnalyze),
      limitFetch: limitVal(limitFetch),
      limitReadMode: limitVal(limitReadMode),
      limitCharacterCreate: limitVal(limitCharacterCreate),
    });
    return created('Plan created', plan.toObject());
  } catch (err) {
    return serverError(err);
  }
}
