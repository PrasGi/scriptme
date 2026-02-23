/**
 * lib/voucher.ts
 * Voucher validation for checkout.
 */

import { Types } from 'mongoose';
import { connectDB } from '@/lib/db';
import Voucher from '@/models/voucher.model';
import Transaction from '@/models/transaction.model';
import type { IVoucher } from '@/models/voucher.model';

export interface ValidateResult {
  valid: true;
  discountIdr: number;
  finalAmountIdr: number;
  voucher: IVoucher;
}

export interface ValidateError {
  valid: false;
  reason: string;
}

/** Validate voucher code for a given user, plan, and base amount. */
export async function validateVoucher(
  code: string,
  userId: string | Types.ObjectId,
  planId: string | Types.ObjectId,
  baseAmountIdr: number
): Promise<ValidateResult | ValidateError> {
  await connectDB();
  const voucher = await Voucher.findOne({
    code: String(code).trim().toUpperCase(),
    isActive: true,
  }).lean();

  if (!voucher) {
    return { valid: false, reason: 'Invalid coupon code' };
  }

  const now = new Date();
  if (voucher.validFrom && new Date(voucher.validFrom) > now) {
    return { valid: false, reason: 'Coupon not yet valid' };
  }
  if (voucher.validTo && new Date(voucher.validTo) < now) {
    return { valid: false, reason: 'Coupon expired' };
  }

  if (voucher.usageLimit != null && voucher.usageCount >= voucher.usageLimit) {
    return { valid: false, reason: 'Coupon limit reached' };
  }

  if (voucher.planIds?.length) {
    const planMatch = (voucher.planIds as Types.ObjectId[]).some(
      (id) => id.toString() === new Types.ObjectId(planId as string).toString()
    );
    if (!planMatch) {
      return { valid: false, reason: 'Coupon not valid for this plan' };
    }
  }

  if (voucher.perUserLimit != null) {
    const userUseCount = await Transaction.countDocuments({
      userId: new Types.ObjectId(userId as string),
      voucherId: voucher._id,
      status: 'completed',
    });
    if (userUseCount >= voucher.perUserLimit) {
      return { valid: false, reason: 'You have already used this coupon' };
    }
  }

  let discountIdr = 0;
  if (voucher.type === 'percent') {
    discountIdr = Math.round((baseAmountIdr * voucher.value) / 100);
  } else {
    discountIdr = Math.min(voucher.value, baseAmountIdr);
  }
  const finalAmountIdr = Math.max(0, baseAmountIdr - discountIdr);

  return {
    valid: true,
    discountIdr,
    finalAmountIdr,
    voucher: voucher as IVoucher,
  };
}
