import { getAuthSession } from '@/lib/auth-session';
import { unauthorized, forbidden, ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Notification from '@/models/notification.model';

/**
 * PATCH /api/notifications/[id]/read
 * Mark a notification as read.
 */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const { id } = await params;
  if (!id) return forbidden();

  try {
    await connectDB();

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: { readAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!notification) return forbidden('Notification not found');

    return ok('Marked as read', {
      _id: notification._id.toString(),
      readAt: notification.readAt!.toISOString(),
    });
  } catch (err) {
    return serverError(err);
  }
}
