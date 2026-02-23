import { auth } from '@/auth';
import { ok, unauthorized } from '@/lib/response';
import { connectDB } from '@/lib/db';
import User from '@/models/user.model';
import Role from '@/models/role.model';
import { getUserPermissions } from '@/lib/permissions';

/**
 * GET /api/auth/me
 * Returns the current authenticated user with resolved permissions.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  await connectDB();

  const user = await User
    .findById(session.user.id)
    .populate<{ roleId: { name: string; description: string } }>('roleId', 'name description')
    .select('-password')
    .lean();

  if (!user) return unauthorized();

  const withPassword = await User.findById(session.user.id).select('password').lean();
  const hasPassword = !!withPassword?.password;

  const permissions = await getUserPermissions(session.user.id, session.user.roleId);

  return ok('User fetched', {
    id:            user._id.toString(),
    name:          user.name,
    email:         user.email,
    image:         user.image ?? null,
    role:          user.roleId,
    isActive:      user.isActive,
    emailVerified: user.emailVerified,
    permissions,
    createdAt:     user.createdAt,
    hasPassword,
  });
}
