/**
 * GET /api/admin/vouchers/[id]
 * PUT /api/admin/vouchers/[id]
 * DELETE /api/admin/vouchers/[id]
 */
import { auth } from '@/auth';
import { unauthorized, forbidden, badRequest, ok, notFound, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Voucher from '@/models/voucher.model';
import { Types } from 'mongoose';

type Params = { params: Promise<{ id: string }> };

async function ensureAdmin() {
  const session = await auth();
  if (!session?.user?.id) return { error: unauthorized() };
  const perms = (session.user as { permissions?: string[] }).permissions ?? [];
  if (!perms.includes('role:read:all')) return { error: forbidden('Admin required') };
  return { error: null };
}

export async function GET(req: Request, { params }: Params) {
  const { error } = await ensureAdmin();
  if (error) return error;

  const { id } = await params;
  try {
    await connectDB();
    const voucher = await Voucher.findById(id).lean();
    if (!voucher) return notFound('Voucher not found');
    return ok('Voucher fetched', voucher);
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(req: Request, { params }: Params) {
  const { error } = await ensureAdmin();
  if (error) return error;

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  try {
    await connectDB();
    const update: Record<string, unknown> = {};
    if (body.code != null) update.code = String(body.code).trim().toUpperCase();
    if (body.type != null && ['percent', 'fixed'].includes(body.type as string)) update.type = body.type;
    if (body.value != null) update.value = Number(body.value);
    if (body.validFrom != null) update.validFrom = new Date(body.validFrom as string);
    if (body.validTo != null) update.validTo = new Date(body.validTo as string);
    if (body.usageLimit !== undefined) update.usageLimit = body.usageLimit == null ? null : Number(body.usageLimit);
    if (body.perUserLimit !== undefined) update.perUserLimit = body.perUserLimit == null ? null : Number(body.perUserLimit);
    if (body.planIds !== undefined) update.planIds = Array.isArray(body.planIds) ? body.planIds.map((x) => new Types.ObjectId(x as string)) : [];
    if (body.isActive !== undefined) update.isActive = Boolean(body.isActive);

    const voucher = await Voucher.findByIdAndUpdate(id, update, { returnDocument: 'after' }).lean();
    if (!voucher) return notFound('Voucher not found');
    return ok('Voucher updated', voucher);
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(req: Request, { params }: Params) {
  const { error } = await ensureAdmin();
  if (error) return error;

  const { id } = await params;
  try {
    await connectDB();
    const voucher = await Voucher.findByIdAndDelete(id);
    if (!voucher) return notFound('Voucher not found');
    return ok('Voucher deleted');
  } catch (err) {
    return serverError(err);
  }
}
