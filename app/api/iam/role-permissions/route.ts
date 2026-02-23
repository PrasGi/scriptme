import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ok, created, unauthorized, forbidden, badRequest, conflict, serverError } from '@/lib/response';
import RolePermission from '@/models/role-permission.model';
import Permission, { IPermission } from '@/models/permission.model';
import Role from '@/models/role.model';
import mongoose, { Types } from 'mongoose';

/**
 * GET /api/iam/role-permissions
 * Optional query: ?roleId=<id>
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  if (!(session.user.permissions ?? []).includes('role:read:all')) return forbidden();

  try {
    await connectDB();
    const url    = new URL(req.url);
    const roleId = url.searchParams.get('roleId');
    const query  = roleId && mongoose.Types.ObjectId.isValid(roleId)
      ? { roleId: new Types.ObjectId(roleId) }
      : {};

    const rows = await RolePermission.find(query)
      .populate<{ permissionId: IPermission }>({ path: 'permissionId', model: Permission })
      .populate('roleId', 'name')
      .lean();

    return ok('Role-permissions fetched', rows.map((rp) => {
      const p = rp.permissionId as IPermission;
      return {
        id:         rp._id.toString(),
        roleId:     rp.roleId.toString(),
        permission: {
          id:          p._id.toString(),
          resource:    p.resource,
          action:      p.action,
          scope:       p.scope,
          description: p.description,
          key:         `${p.resource}:${p.action}:${p.scope}`,
        },
        createdAt: rp.createdAt,
      };
    }));
  } catch (err) {
    return serverError(err);
  }
}

/**
 * POST /api/iam/role-permissions
 * Body: { roleId, permissionId }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  if (!(session.user.permissions ?? []).includes('role:update:all')) return forbidden();

  try {
    await connectDB();
    const { roleId, permissionId } = await req.json();
    if (!roleId || !permissionId) return badRequest('roleId and permissionId are required');
    if (!mongoose.Types.ObjectId.isValid(roleId) || !mongoose.Types.ObjectId.isValid(permissionId)) {
      return badRequest('Invalid roleId or permissionId');
    }

    const [role, perm] = await Promise.all([
      Role.findById(roleId).lean(),
      Permission.findById(permissionId).lean(),
    ]);
    if (!role) return badRequest('Role not found');
    if (!perm) return badRequest('Permission not found');

    const existing = await RolePermission.findOne({
      roleId:       new Types.ObjectId(roleId),
      permissionId: new Types.ObjectId(permissionId),
    }).lean();
    if (existing) return conflict('Permission already assigned to this role');

    const rp = await RolePermission.create({
      roleId:       new Types.ObjectId(roleId),
      permissionId: new Types.ObjectId(permissionId),
    });

    logger.info('Permission assigned to role', {
      eventType: 'crud.create', resource: 'role_permission',
      auth: { userId: session.user.id },
      data: { created: { roleId, permissionId } },
    });

    return created('Permission assigned', { id: rp._id.toString(), roleId, permissionId });
  } catch (err) {
    return serverError(err);
  }
}
