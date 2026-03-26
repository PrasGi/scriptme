/**
 * POST /api/billing/upgrade
 * Create pending transaction (plan, months, optional coupon). Returns transaction summary.
 * Body: { planSlug, months, couponCode? }
 */
import { getAuthSession } from '@/lib/auth-session';
import { unauthorized, badRequest, ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Plan from '@/models/plan.model';
import Transaction from '@/models/transaction.model';
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

  let body: { planSlug?: string; months?: number; couponCode?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { planSlug, months, couponCode } = body;
  if (!planSlug || typeof planSlug !== 'string' || typeof months !== 'number') {
    return badRequest('planSlug and months are required');
  }
  if (![1, 3, 6].includes(months)) {
    return badRequest('months must be 1, 3, or 6');
  }

  try {
    await connectDB();
    const plan = await Plan.findOne({ slug: planSlug, isActive: true }).lean();
    if (!plan) return badRequest('Plan not found');

    let baseAmountIdr = computeBaseAmount(plan, months);
    if (baseAmountIdr == null || baseAmountIdr < 0) {
      return badRequest('Plan has no payable price');
    }
    if (plan.priceMonthly == null || plan.priceMonthly === 0) {
      baseAmountIdr = 0;
    }

    let amountIdr = baseAmountIdr;
    let voucherId: Types.ObjectId | null = null;
    let voucherCode: string | null = null;
    let voucherDiscountIdr: number | null = null;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim() && baseAmountIdr > 0) {
      const result = await validateVoucher(couponCode.trim(), session.user.id, plan._id, baseAmountIdr);
      if (result.valid) {
        voucherId = result.voucher._id as Types.ObjectId;
        voucherCode = result.voucher.code;
        voucherDiscountIdr = result.discountIdr;
        amountIdr = result.finalAmountIdr;
      }
    }

    const discountPercent = months === 1 ? (plan.discount1Month ?? 0) : months === 3 ? (plan.discount3Months ?? 0) : (plan.discount6Months ?? 0);

    const tx = await Transaction.create({
      userId: new Types.ObjectId(session.user.id),
      planId: plan._id,
      months,
      amountIdr,
      discountPercent,
      voucherId,
      voucherCode,
      voucherDiscountIdr,
      status: 'pending',
    });

    return ok('Transaction created', {
      transactionId: tx._id,
      planName: plan.name,
      months,
      amountIdr,
      baseAmountIdr,
      voucherDiscountIdr: voucherDiscountIdr ?? 0,
      summary: `${plan.name} — ${months} month${months > 1 ? 's' : ''} — Rp ${amountIdr.toLocaleString('id-ID')}`,
    });
  } catch (err) {
    return serverError(err);
  }
}
