import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ok, created, unauthorized, forbidden, badRequest, serverError } from '@/lib/response';
import UserPermission from '@/models/user-permission.model';
import Permission, { IPermission } from '@/models/permission.model';
import User from '@/models/user.model';
import mongoose, { Types } from 'mongoose';

/**
 * GET /api/iam/user-permissions
 * Optional query: ?userId=<id>
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  if (!(session.user.permissions ?? []).includes('user:read:all')) return forbidden();

  try {
    await connectDB();
    const url    = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const query  = userId && mongoose.Types.ObjectId.isValid(userId)
      ? { userId: new Types.ObjectId(userId) }
      : {};

    const rows = await UserPermission.find(query)
      .populate<{ permissionId: IPermission }>({ path: 'permissionId', model: Permission })
      .lean();

    return ok('User-permissions fetched', rows.map((up) => {
      const p = up.permissionId as IPermission;
      return {
        id:         up._id.toString(),
        userId:     up.userId.toString(),
        granted:    up.granted,
        permission: {
          id:          p._id.toString(),
          resource:    p.resource,
          action:      p.action,
          scope:       p.scope,
          description: p.description,
          key:         `${p.resource}:${p.action}:${p.scope}`,
        },
        createdAt: up.createdAt,
      };
    }));
  } catch (err) {
    return serverError(err);
  }
}

/**
 * POST /api/iam/user-permissions — upsert a user permission override
 * Body: { userId, permissionId, granted }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();
  if (!(session.user.permissions ?? []).includes('user:update:all')) return forbidden();

  try {
    await connectDB();
    const { userId, permissionId, granted } = await req.json();

    if (!userId || !permissionId || granted === undefined) {
      return badRequest('userId, permissionId, and granted are required');
    }
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(permissionId)) {
      return badRequest('Invalid userId or permissionId');
    }

    const [user, perm] = await Promise.all([
      User.findOne({ _id: userId, deletedAt: null }).lean(),
      Permission.findById(permissionId).lean(),
    ]);
    if (!user) return badRequest('User not found');
    if (!perm) return badRequest('Permission not found');

    const up = await UserPermission.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), permissionId: new Types.ObjectId(permissionId) },
      { $set: { granted: Boolean(granted) } },
      { upsert: true, new: true }
    );

    logger.info('User permission override set', {
      eventType: 'crud.create', resource: 'user_permission',
      auth: { userId: session.user.id },
      data: { created: { userId, permissionId, granted } },
    });

    return created('User permission override saved', { id: up._id.toString(), userId, permissionId, granted: up.granted });
  } catch (err) {
    return serverError(err);
  }
}
