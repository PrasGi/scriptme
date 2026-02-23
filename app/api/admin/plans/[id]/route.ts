/**
 * GET /api/admin/plans/[id]
 * PUT /api/admin/plans/[id]
 * DELETE /api/admin/plans/[id]
 */
import { auth } from '@/auth';
import { unauthorized, forbidden, badRequest, ok, notFound, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Plan from '@/models/plan.model';

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
    const plan = await Plan.findById(id).lean();
    if (!plan) return notFound('Plan not found');
    return ok('Plan fetched', plan);
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
    const plan = await Plan.findByIdAndUpdate(
      id,
      {
        ...(body.name != null && { name: String(body.name).trim() }),
        ...(body.slug != null && { slug: String(body.slug).trim().toLowerCase() }),
        ...(body.priceMonthly !== undefined && { priceMonthly: body.priceMonthly === null ? null : Number(body.priceMonthly) }),
        ...(body.discount1Month !== undefined && { discount1Month: Number(body.discount1Month) || 0 }),
        ...(body.discount3Months !== undefined && { discount3Months: Number(body.discount3Months) || 0 }),
        ...(body.discount6Months !== undefined && { discount6Months: Number(body.discount6Months) || 0 }),
        ...(body.tokenLimitMonthly !== undefined && { tokenLimitMonthly: body.tokenLimitMonthly === null ? null : Number(body.tokenLimitMonthly) }),
        ...(body.features !== undefined && { features: Array.isArray(body.features) ? body.features.map(String) : [] }),
        ...(body.cta != null && { cta: String(body.cta).trim() }),
        ...(body.badge !== undefined && { badge: body.badge == null ? null : String(body.badge) }),
        ...(body.isActive !== undefined && { isActive: Boolean(body.isActive) }),
        ...(body.order !== undefined && { order: Number(body.order) || 0 }),
        ...('showFeaturesToUser' in body && { showFeaturesToUser: Boolean(body.showFeaturesToUser) }),
        ...(body.limitProjectCreate !== undefined && { limitProjectCreate: body.limitProjectCreate === null || body.limitProjectCreate === '' ? null : (Number(body.limitProjectCreate) || null) }),
        ...(body.limitSave !== undefined && { limitSave: body.limitSave === null || body.limitSave === '' ? null : (Number(body.limitSave) || null) }),
        ...(body.limitExport !== undefined && { limitExport: body.limitExport === null || body.limitExport === '' ? null : (Number(body.limitExport) || null) }),
        ...(body.limitAnalyze !== undefined && { limitAnalyze: body.limitAnalyze === null || body.limitAnalyze === '' ? null : (Number(body.limitAnalyze) || null) }),
        ...(body.limitFetch !== undefined && { limitFetch: body.limitFetch === null || body.limitFetch === '' ? null : (Number(body.limitFetch) || null) }),
        ...(body.limitReadMode !== undefined && { limitReadMode: body.limitReadMode === null || body.limitReadMode === '' ? null : (Number(body.limitReadMode) || null) }),
        ...(body.limitCharacterCreate !== undefined && { limitCharacterCreate: body.limitCharacterCreate === null || body.limitCharacterCreate === '' ? null : (Number(body.limitCharacterCreate) || null) }),
      },
      { new: true }
    ).lean();
    if (!plan) return notFound('Plan not found');
    return ok('Plan updated', plan);
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
    const plan = await Plan.findByIdAndDelete(id);
    if (!plan) return notFound('Plan not found');
    return ok('Plan deleted');
  } catch (err) {
    return serverError(err);
  }
}
