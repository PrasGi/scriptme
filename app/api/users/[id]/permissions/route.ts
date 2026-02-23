import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ok, unauthorized, forbidden, notFound, badRequest, serverError } from '@/lib/response';
import User from '@/models/user.model';
import Permission from '@/models/permission.model';
import UserPermission from '@/models/user-permission.model';
import RolePermission from '@/models/role-permission.model';
import { getUserPermissions } from '@/lib/permissions';
import mongoose, { Types } from 'mongoose';

interface Ctx { params: Promise<{ id: string }> }

/**
 * GET /api/users/[id]/permissions
 * Returns effective permissions + per-user overrides for the user.
 */
export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const perms   = session.user.permissions ?? [];
  if (!perms.includes('user:read:all')) return forbidden();

  try {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) return notFound('User not found');

    const user = await User.findOne({ _id: id, deletedAt: null })
      .populate<{ roleId: { _id: string; name: string } }>('roleId', 'name')
      .select('-password')
      .lean();
    if (!user) return notFound('User not found');

    const populatedRole = user.roleId as unknown as { _id: Types.ObjectId; name: string };
    const roleId = populatedRole._id.toString();

    // All permissions in the system
    const allPerms = await Permission.find({}).sort({ resource: 1, action: 1 }).lean();

    // Role's default permissions
    const rolePerms = await RolePermission.find({
      roleId: new Types.ObjectId(roleId),
    }).lean();
    const rolePermIds = new Set(rolePerms.map((rp) => rp.permissionId.toString()));

    // Per-user overrides
    const userPerms = await UserPermission.find({
      userId: new Types.ObjectId(id),
    }).lean();
    const overrideMap = new Map(userPerms.map((up) => [up.permissionId.toString(), up.granted]));

    // Effective permissions (resolved)
    const effective = await getUserPermissions(id, roleId);
    const effectiveSet = new Set(effective.map((p) => `${p.resource}:${p.action}:${p.scope}`));

    return ok('User permissions fetched', {
      user: {
        id:    user._id.toString(),
        name:  user.name,
        email: user.email,
        role:  user.roleId,
      },
      permissions: allPerms.map((p) => {
        const pid = p._id.toString();
        return {
          id:          pid,
          resource:    p.resource,
          action:      p.action,
          scope:       p.scope,
          description: p.description,
          fromRole:    rolePermIds.has(pid),
          override:    overrideMap.has(pid) ? overrideMap.get(pid) : null, // null = no override
          effective:   effectiveSet.has(`${p.resource}:${p.action}:${p.scope}`),
        };
      }),
    });
  } catch (err) {
    logger.error('Failed to fetch user permissions', { eventType: 'app.error', error: err });
    return serverError(err);
  }
}

/**
 * PUT /api/users/[id]/permissions
 * Body: { overrides: Array<{ permissionId: string; granted: boolean | null }> }
 * granted=null removes the override (falls back to role default).
 */
export async function PUT(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  const perms   = session.user.permissions ?? [];
  if (!perms.includes('user:update:all')) return forbidden();

  try {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) return notFound('User not found');

    const user = await User.findOne({ _id: id, deletedAt: null }).lean();
    if (!user) return notFound('User not found');

    const body = await req.json();
    const overrides: Array<{ permissionId: string; granted: boolean | null }> = body.overrides;

    if (!Array.isArray(overrides)) return badRequest('overrides must be an array');

    for (const o of overrides) {
      if (!mongoose.Types.ObjectId.isValid(o.permissionId)) continue;
      const permId = new Types.ObjectId(o.permissionId);
      const userId  = new Types.ObjectId(id);

      if (o.granted === null) {
        // Remove override
        await UserPermission.deleteOne({ userId, permissionId: permId });
      } else {
        // Upsert override
        await UserPermission.findOneAndUpdate(
          { userId, permissionId: permId },
          { $set: { granted: Boolean(o.granted) } },
          { upsert: true }
        );
      }
    }

    logger.info('User permission overrides updated', {
      eventType: 'crud.update',
      resource:  'user_permission',
      auth:      { userId: session.user.id },
      data:      { after: { targetUserId: id, overrideCount: overrides.length } },
    });

    return ok('Permissions updated');
  } catch (err) {
    logger.error('Failed to update user permissions', { eventType: 'app.error', error: err });
    return serverError(err);
  }
}
