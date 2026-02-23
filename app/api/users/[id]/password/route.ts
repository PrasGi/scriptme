import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ok, unauthorized, forbidden, notFound, badRequest, serverError } from '@/lib/response';
import User from '@/models/user.model';
import mongoose from 'mongoose';

interface Ctx { params: Promise<{ id: string }> }

/**
 * PATCH /api/users/[id]/password
 * Update own password. Requires currentPassword + newPassword.
 * Users who signed up via OAuth (no password) cannot use this.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  if (session.user.id !== id) return forbidden();

  try {
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || typeof currentPassword !== 'string') {
      return badRequest('Current password is required');
    }
    if (!newPassword || typeof newPassword !== 'string') {
      return badRequest('New password is required');
    }
    if (newPassword.length < 8) {
      return badRequest('New password must be at least 8 characters');
    }

    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) return notFound('User not found');

    const user = await User.findOne({ _id: id, deletedAt: null }).select('+password');
    if (!user) return notFound('User not found');

    if (!user.password) {
      return badRequest('You signed in with a social account. Use that provider to manage sign-in.');
    }

    const valid = await user.comparePassword(currentPassword);
    if (!valid) return badRequest('Current password is incorrect');

    user.password = newPassword;
    await user.save();

    logger.info('Password updated', {
      eventType: 'auth.password_changed',
      auth:      { userId: session.user.id },
    });

    return ok('Password updated');
  } catch (err) {
    logger.error('Failed to update password', { eventType: 'app.error', error: err });
    return serverError(err);
  }
}
