import { getAuthSession } from '@/lib/auth-session';
import { connectDB } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ok, created, unauthorized, forbidden, badRequest, serverError } from '@/lib/response';
import Permission from '@/models/permission.model';

/** GET /api/iam/permissions — list all permissions */
export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();
  if (!(session.user.permissions ?? []).includes('permission:read:all')) return forbidden();

  try {
    await connectDB();
    const perms = await Permission.find({}).sort({ resource: 1, action: 1, scope: 1 }).lean();
    return ok('Permissions fetched', perms.map((p) => ({
      id:          p._id.toString(),
      resource:    p.resource,
      action:      p.action,
      scope:       p.scope,
      description: p.description,
      key:         `${p.resource}:${p.action}:${p.scope}`,
      createdAt:   p.createdAt,
    })));
  } catch (err) {
    return serverError(err);
  }
}

/** POST /api/iam/permissions — create a new permission */
export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();
  if (!(session.user.permissions ?? []).includes('permission:create:all')) return forbidden();

  try {
    await connectDB();
    const { resource, action, scope, description } = await req.json();
    if (!resource || !action || !scope || !description) {
      return badRequest('resource, action, scope, and description are required');
    }
    if (!['own', 'all'].includes(scope)) return badRequest("scope must be 'own' or 'all'");

    const exists = await Permission.findOne({ resource, action, scope }).lean();
    if (exists) return badRequest('Permission already exists');

    const perm = await Permission.create({
      resource: resource.toLowerCase().trim(),
      action:   action.toLowerCase().trim(),
      scope,
      description,
    });

    logger.info('Permission created', {
      eventType: 'crud.create', resource: 'permission',
      auth: { userId: session.user.id },
      data: { created: { id: perm._id.toString(), key: `${perm.resource}:${perm.action}:${perm.scope}` } },
    });

    return created('Permission created', {
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
