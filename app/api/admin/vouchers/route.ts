/**
 * GET /api/admin/vouchers
 * POST /api/admin/vouchers
 */
import { auth } from '@/auth';
import { unauthorized, forbidden, badRequest, created, ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Voucher, { type VoucherType } from '@/models/voucher.model';
import { Types } from 'mongoose';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  const perms = (session.user as { permissions?: string[] }).permissions ?? [];
  if (!perms.includes('role:read:all')) return forbidden('Admin required');

  try {
    await connectDB();
    const vouchers = await Voucher.find().sort({ createdAt: -1 }).lean();
    return ok('Vouchers fetched', vouchers);
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  const session = await auth();
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
    code,
    type,
    value,
    validFrom,
    validTo,
    usageLimit,
    perUserLimit,
    planIds = [],
    isActive = true,
  } = body as Record<string, unknown>;

  if (
    !code ||
    typeof code !== 'string' ||
    !type ||
    !['percent', 'fixed'].includes(type as string) ||
    typeof value !== 'number' ||
    !validFrom ||
    !validTo
  ) {
    return badRequest('code, type (percent|fixed), value, validFrom, validTo are required');
  }

  try {
    await connectDB();
    const voucher = await Voucher.create({
      code: String(code).trim().toUpperCase(),
      type: type as VoucherType,
      value,
      validFrom: new Date(validFrom as string),
      validTo: new Date(validTo as string),
      usageLimit: usageLimit != null ? Number(usageLimit) : null,
      perUserLimit: perUserLimit != null ? Number(perUserLimit) : null,
      planIds: Array.isArray(planIds) ? planIds.map((id) => new Types.ObjectId(id as string)) : [],
      isActive: Boolean(isActive),
    });
    return created('Voucher created', voucher.toObject());
  } catch (err) {
    return serverError(err);
  }
}
