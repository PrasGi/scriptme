import { getAuthSession } from '@/lib/auth-session';
import { connectDB } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ok, unauthorized, forbidden, notFound, badRequest, serverError } from '@/lib/response';
import Permission from '@/models/permission.model';
import RolePermission from '@/models/role-permission.model';
import UserPermission from '@/models/user-permission.model';
import mongoose from 'mongoose';

interface Ctx { params: Promise<{ id: string }> }

/** PUT /api/iam/permissions/[id] */
export async function PUT(req: Request, { params }: Ctx) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();
  if (!(session.user.permissions ?? []).includes('permission:update:all')) return forbidden();

  const { id } = await params;
  try {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) return notFound('Permission not found');

    const perm = await Permission.findById(id);
    if (!perm) return notFound('Permission not found');

    const { resource, action, scope, description } = await req.json();
    if (resource    !== undefined) perm.resource    = String(resource).toLowerCase().trim();
    if (action      !== undefined) perm.action      = String(action).toLowerCase().trim();
    if (scope       !== undefined) {
      if (!['own', 'all'].includes(scope)) return badRequest("scope must be 'own' or 'all'");
      perm.scope = scope;
    }
    if (description !== undefined) perm.description = String(description);

    await perm.save();
    logger.info('Permission updated', { eventType: 'crud.update', resource: 'permission', auth: { userId: session.user.id } });

    return ok('Permission updated', {
      id:          perm._id.toString(),
      resource:    perm.resource,
      action:      perm.action,
      scope:       perm.scope,
      description: perm.description,
      key:         `${perm.resource}:${perm.action}:${perm.scope}`,
    });
  } catch (err) {
    return serverError(err);
  }
}

/** DELETE /api/iam/permissions/[id] */
export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();
  if (!(session.user.permissions ?? []).includes('permission:delete:all')) return forbidden();

  const { id } = await params;
  try {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) return notFound('Permission not found');

    const perm = await Permission.findById(id).lean();
    if (!perm) return notFound('Permission not found');

    const oid = new mongoose.Types.ObjectId(id);
    await Promise.all([
      Permission.findByIdAndDelete(id),
      RolePermission.deleteMany({ permissionId: oid }),
      UserPermission.deleteMany({ permissionId: oid }),
    ]);

    logger.info('Permission deleted', {
      eventType: 'crud.delete', resource: 'permission',
      auth: { userId: session.user.id },
      data: { before: { key: `${perm.resource}:${perm.action}:${perm.scope}` } },
    });
    return ok('Permission deleted');
  } catch (err) {
    return serverError(err);
  }
}
