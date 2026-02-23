import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ok, created, unauthorized, forbidden, badRequest, serverError } from '@/lib/response';
import User from '@/models/user.model';
import Role from '@/models/role.model';
import mongoose from 'mongoose';

/** GET /api/users — list all non-deleted users */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const perms = session.user.permissions ?? [];
  if (!perms.includes('user:read:all')) return forbidden();

  try {
    await connectDB();

    const url     = new URL(req.url);
    const search  = url.searchParams.get('search') ?? '';
    const roleId  = url.searchParams.get('roleId') ?? '';
    const page    = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
    const limit   = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? '20')));

    const query: Record<string, unknown> = { deletedAt: null };
    if (search) {
      query['$or'] = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (roleId && mongoose.Types.ObjectId.isValid(roleId)) {
      query['roleId'] = new mongoose.Types.ObjectId(roleId);
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .populate<{ roleId: { _id: string; name: string } }>('roleId', 'name')
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return ok('Users fetched', {
      users: users.map((u) => ({
        id:            u._id.toString(),
        name:          u.name,
        email:         u.email,
        image:         u.image ?? null,
        role:          u.roleId,
        isActive:      u.isActive,
        emailVerified: u.emailVerified,
        createdAt:     u.createdAt,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error('Failed to list users', { eventType: 'app.error', error: err });
    return serverError(err);
  }
}

/** POST /api/users — create a new user (admin only) */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const perms = session.user.permissions ?? [];
  if (!perms.includes('user:create:all')) return forbidden();

  try {
    await connectDB();

    const body = await req.json();
    const { name, email, password, roleId, isActive = true } = body;

    if (!name || !email || !password || !roleId) {
      return badRequest('name, email, password, and roleId are required');
    }

    if (!mongoose.Types.ObjectId.isValid(roleId)) {
      return badRequest('Invalid roleId');
    }

    const existingRole = await Role.findById(roleId).lean();
    if (!existingRole) return badRequest('Role not found');

    const existing = await User.findOne({ email: email.toLowerCase().trim() }).lean();
    if (existing) return badRequest('Email already in use');

    const user = await User.create({
      name:     name.trim(),
      email:    email.toLowerCase().trim(),
      password,
      roleId,
      isActive,
      deletedAt: null,
    });

    logger.info('User created', {
      eventType: 'crud.create',
      resource:  'user',
      auth:      { userId: session.user.id, email: session.user.email! },
      data:      { created: { id: user._id.toString(), email: user.email } },
    });

    return created('User created', {
      id:       user._id.toString(),
      name:     user.name,
      email:    user.email,
      isActive: user.isActive,
    });
  } catch (err) {
    logger.error('Failed to create user', { eventType: 'app.error', error: err });
    return serverError(err);
  }
}
