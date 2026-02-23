import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ok, created, unauthorized, forbidden, badRequest, serverError } from '@/lib/response';
import Role from '@/models/role.model';

/** GET /api/iam/roles — list all roles */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const perms = session.user.permissions ?? [];
  if (!perms.includes('role:read:all')) return forbidden();

  try {
    await connectDB();
    const roles = await Role.find({}).sort({ createdAt: 1 }).lean();
    return ok('Roles fetched', roles.map((r) => ({
      id:          r._id.toString(),
      name:        r.name,
      description: r.description,
      isDefault:   r.isDefault,
      createdAt:   r.createdAt,
    })));
  } catch (err) {
    logger.error('Failed to list roles', { eventType: 'app.error', error: err });
    return serverError(err);
  }
}

/** POST /api/iam/roles — create a new role */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const perms = session.user.permissions ?? [];
  if (!perms.includes('role:create:all')) return forbidden();

  try {
    await connectDB();
    const { name, description, isDefault = false } = await req.json();
    if (!name || !description) return badRequest('name and description are required');

    const exists = await Role.findOne({ name: name.toLowerCase().trim() }).lean();
    if (exists) return badRequest('Role name already exists');

    const role = await Role.create({ name: name.toLowerCase().trim(), description, isDefault });

    logger.info('Role created', {
      eventType: 'crud.create',
      resource:  'role',
      auth:      { userId: session.user.id },
      data:      { created: { id: role._id.toString(), name: role.name } },
    });

    return created('Role created', { id: role._id.toString(), name: role.name, description: role.description, isDefault: role.isDefault });
  } catch (err) {
    logger.error('Failed to create role', { eventType: 'app.error', error: err });
    return serverError(err);
  }
}
