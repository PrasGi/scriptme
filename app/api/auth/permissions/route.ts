import { NextRequest } from 'next/server';
import { getAuthSession } from '@/lib/auth-session';
import { ok, unauthorized, badRequest } from '@/lib/response';
import { getUserPermissions, hasPermission } from '@/lib/permissions';

/**
 * GET /api/auth/permissions
 * Returns all resolved permissions for the current user.
 * 
 * Optional query params for a single-check:
 *   ?resource=project&action=create&scope=own
 *   → returns { has: true|false }
 */
export async function GET(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const { searchParams } = new URL(req.url);
  const resource = searchParams.get('resource');
  const action   = searchParams.get('action');
  const scope    = searchParams.get('scope') as 'own' | 'all' | null;

  // Single permission check
  if (resource && action) {
    if (scope && scope !== 'own' && scope !== 'all') {
      return badRequest('scope must be "own" or "all"');
    }
    const result = await hasPermission(
      session.user.id,
      session.user.roleId,
      resource,
      action,
      scope ?? undefined
    );
    return ok('Permission checked', { has: result, resource, action, scope });
  }

  // List all permissions
  const permissions = await getUserPermissions(session.user.id, session.user.roleId);
  return ok('Permissions fetched', { permissions });
}
