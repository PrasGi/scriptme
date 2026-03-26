/**
 * POST /api/billing/validate-coupon
 * Validate coupon for plan + months. Returns discount and final amount in IDR.
 * Body: { code, planSlug, months }
 */
import { getAuthSession } from '@/lib/auth-session';
import { unauthorized, badRequest, ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Plan from '@/models/plan.model';
import { validateVoucher } from '@/lib/voucher';
import { Types } from 'mongoose';

function computeBaseAmount(plan: { priceMonthly: number | null; discount1Month?: number; discount3Months?: number; discount6Months?: number }, months: number): number | null {
  if (plan.priceMonthly == null || plan.priceMonthly <= 0) return null;
  const discount = months === 1 ? (plan.discount1Month ?? 0) : months === 3 ? (plan.discount3Months ?? 0) : months === 6 ? (plan.discount6Months ?? 0) : 0;
  const base = plan.priceMonthly * months;
  return Math.round(base * (1 - discount / 100));
}

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  let body: { code?: string; planSlug?: string; months?: number };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { code, planSlug, months } = body;
  if (!code || typeof code !== 'string' || !planSlug || typeof planSlug !== 'string' || typeof months !== 'number') {
    return badRequest('code, planSlug, and months are required');
  }
  if (![1, 3, 6].includes(months)) {
    return badRequest('months must be 1, 3, or 6');
  }

  try {
    await connectDB();
    const plan = await Plan.findOne({ slug: planSlug, isActive: true }).lean();
    if (!plan) return badRequest('Plan not found');

    const baseAmountIdr = computeBaseAmount(plan, months);
    if (baseAmountIdr == null || baseAmountIdr <= 0) {
      return ok('Coupon validated (no discount applicable)', {
        valid: false,
        reason: 'Plan has no payable price',
        baseAmountIdr: 0,
        discountIdr: 0,
        finalAmountIdr: 0,
      });
    }

    const result = await validateVoucher(code, session.user.id, plan._id, baseAmountIdr);
    if (result.valid) {
      return ok('Coupon applied', {
        valid: true,
        discountIdr: result.discountIdr,
        finalAmountIdr: result.finalAmountIdr,
        baseAmountIdr,
      });
    }
    return ok('Coupon invalid', {
      valid: false,
      reason: result.reason,
      baseAmountIdr,
      discountIdr: 0,
      finalAmountIdr: baseAmountIdr,
    });
  } catch (err) {
    return serverError(err);
  }
}
