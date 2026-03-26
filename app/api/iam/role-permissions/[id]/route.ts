import { getAuthSession } from '@/lib/auth-session';
import { connectDB } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ok, unauthorized, forbidden, notFound, serverError } from '@/lib/response';
import RolePermission from '@/models/role-permission.model';
import mongoose from 'mongoose';

interface Ctx { params: Promise<{ id: string }> }

/** DELETE /api/iam/role-permissions/[id] */
export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();
  if (!(session.user.permissions ?? []).includes('role:update:all')) return forbidden();

  const { id } = await params;
  try {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) return notFound('Role-permission not found');

    const rp = await RolePermission.findById(id).lean();
    if (!rp) return notFound('Role-permission not found');

    await RolePermission.findByIdAndDelete(id);

    logger.info('Permission removed from role', {
      eventType: 'crud.delete', resource: 'role_permission',
      auth: { userId: session.user.id },
      data: { before: { id } },
    });
    return ok('Permission removed from role');
  } catch (err) {
    return serverError(err);
  }
}
