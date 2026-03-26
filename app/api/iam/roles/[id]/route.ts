import { getAuthSession } from '@/lib/auth-session';
import { connectDB } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ok, unauthorized, forbidden, notFound, badRequest, serverError } from '@/lib/response';
import Role from '@/models/role.model';
import RolePermission from '@/models/role-permission.model';
import mongoose from 'mongoose';

interface Ctx { params: Promise<{ id: string }> }

/** GET /api/iam/roles/[id] */
export async function GET(_req: Request, { params }: Ctx) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();
  if (!(session.user.permissions ?? []).includes('role:read:all')) return forbidden();

  const { id } = await params;
  try {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) return notFound('Role not found');
    const role = await Role.findById(id).lean();
    if (!role) return notFound('Role not found');
    return ok('Role fetched', { id: role._id.toString(), name: role.name, description: role.description, isDefault: role.isDefault, createdAt: role.createdAt });
  } catch (err) {
    return serverError(err);
  }
}

/** PUT /api/iam/roles/[id] */
export async function PUT(req: Request, { params }: Ctx) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();
  if (!(session.user.permissions ?? []).includes('role:update:all')) return forbidden();

  const { id } = await params;
  try {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) return notFound('Role not found');
    const role = await Role.findById(id);
    if (!role) return notFound('Role not found');

    const { name, description, isDefault } = await req.json();
    if (name        !== undefined) role.name        = String(name).toLowerCase().trim();
    if (description !== undefined) role.description = String(description);
    if (isDefault   !== undefined) role.isDefault   = Boolean(isDefault);

    await role.save();
    logger.info('Role updated', { eventType: 'crud.update', resource: 'role', auth: { userId: session.user.id } });
    return ok('Role updated', { id: role._id.toString(), name: role.name, description: role.description, isDefault: role.isDefault });
  } catch (err) {
    return serverError(err);
  }
}

/** DELETE /api/iam/roles/[id] */
export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();
  if (!(session.user.permissions ?? []).includes('role:delete:all')) return forbidden();

  const { id } = await params;
  try {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) return notFound('Role not found');

    const role = await Role.findById(id).lean();
    if (!role) return notFound('Role not found');
    if (role.name === 'admin') return badRequest('Cannot delete the admin role');

    await Promise.all([
      Role.findByIdAndDelete(id),
      RolePermission.deleteMany({ roleId: new mongoose.Types.ObjectId(id) }),
    ]);

    logger.info('Role deleted', {
      eventType: 'crud.delete', resource: 'role',
      auth: { userId: session.user.id },
      data: { before: { id, name: role.name } },
    });
    return ok('Role deleted');
  } catch (err) {
    return serverError(err);
  }
}
