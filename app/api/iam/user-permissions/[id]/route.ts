import { getAuthSession } from '@/lib/auth-session';
import { connectDB } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ok, unauthorized, forbidden, notFound, serverError } from '@/lib/response';
import UserPermission from '@/models/user-permission.model';
import mongoose from 'mongoose';

interface Ctx { params: Promise<{ id: string }> }

/** DELETE /api/iam/user-permissions/[id] — remove a user permission override */
export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();
  if (!(session.user.permissions ?? []).includes('user:update:all')) return forbidden();

  const { id } = await params;
  try {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) return notFound('Override not found');

    const up = await UserPermission.findById(id).lean();
    if (!up) return notFound('Override not found');

    await UserPermission.findByIdAndDelete(id);

    logger.info('User permission override removed', {
      eventType: 'crud.delete', resource: 'user_permission',
      auth: { userId: session.user.id },
      data: { before: { id } },
    });
    return ok('Override removed');
  } catch (err) {
    return serverError(err);
  }
}
