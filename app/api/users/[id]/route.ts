import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ok, unauthorized, forbidden, notFound, badRequest, serverError } from '@/lib/response';
import User from '@/models/user.model';
import Role from '@/models/role.model';
import mongoose from 'mongoose';

interface Ctx { params: Promise<{ id: string }> }

/** GET /api/users/[id] */
export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const perms   = session.user.permissions ?? [];
  const isSelf  = session.user.id === id;

  if (!isSelf && !perms.includes('user:read:all')) return forbidden();

  try {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) return notFound('User not found');

    const user = await User.findOne({ _id: id, deletedAt: null })
      .populate<{ roleId: { _id: string; name: string } }>('roleId', 'name')
      .select('-password')
      .lean();

    if (!user) return notFound('User not found');

    return ok('User fetched', {
      id:            user._id.toString(),
      name:          user.name,
      email:         user.email,
      image:         user.image ?? null,
      role:          user.roleId,
      isActive:      user.isActive,
      emailVerified: user.emailVerified,
      createdAt:     user.createdAt,
      updatedAt:     user.updatedAt,
    });
  } catch (err) {
    logger.error('Failed to fetch user', { eventType: 'app.error', error: err });
    return serverError(err);
  }
}

/** PUT /api/users/[id] — update name, email, roleId, isActive */
export async function PUT(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const perms   = session.user.permissions ?? [];
  const isSelf  = session.user.id === id;

  // Own profile: needs user:update:own. Others: needs user:update:all
  if (isSelf && !perms.includes('user:update:own') && !perms.includes('user:update:all')) return forbidden();
  if (!isSelf && !perms.includes('user:update:all')) return forbidden();

  try {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) return notFound('User not found');

    const user = await User.findOne({ _id: id, deletedAt: null });
    if (!user) return notFound('User not found');

    const body = await req.json();
    const { name, email, roleId, isActive } = body;

    if (name    !== undefined) user.name     = String(name).trim();
    if (email   !== undefined) user.email    = String(email).toLowerCase().trim();
    if (isActive !== undefined && perms.includes('user:update:all')) user.isActive = Boolean(isActive);
    if (roleId  !== undefined && perms.includes('user:update:all')) {
      if (!mongoose.Types.ObjectId.isValid(roleId)) return badRequest('Invalid roleId');
      const role = await Role.findById(roleId).lean();
      if (!role) return badRequest('Role not found');
      user.roleId = new mongoose.Types.ObjectId(roleId);
    }

    await user.save();

    logger.info('User updated', {
      eventType: 'crud.update',
      resource:  'user',
      auth:      { userId: session.user.id },
      data:      { after: { id: user._id.toString(), email: user.email } },
    });

    return ok('User updated', {
      id:       user._id.toString(),
      name:     user.name,
      email:    user.email,
      isActive: user.isActive,
    });
  } catch (err) {
    logger.error('Failed to update user', { eventType: 'app.error', error: err });
    return serverError(err);
  }
}

/** DELETE /api/users/[id] — soft delete (sets deletedAt + isActive=false) */
export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const perms   = session.user.permissions ?? [];
  if (!perms.includes('user:delete:all')) return forbidden();

  // Prevent self-deletion
  if (session.user.id === id) return badRequest('Cannot delete your own account');

  try {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) return notFound('User not found');

    const user = await User.findOne({ _id: id, deletedAt: null });
    if (!user) return notFound('User not found');

    user.deletedAt = new Date();
    user.isActive  = false;
    await user.save();

    logger.info('User soft-deleted', {
      eventType: 'crud.delete',
      resource:  'user',
      auth:      { userId: session.user.id },
      data:      { before: { id: user._id.toString(), email: user.email } },
    });

    return ok('User deleted');
  } catch (err) {
    logger.error('Failed to delete user', { eventType: 'app.error', error: err });
    return serverError(err);
  }
}
