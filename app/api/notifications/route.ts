import { getAuthSession } from '@/lib/auth-session';
import { unauthorized, ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Notification from '@/models/notification.model';

/**
 * GET /api/notifications
 * List current user's notifications (most recent first).
 */
export async function GET() {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  try {
    await connectDB();

    const notifications = await Notification.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return ok('Notifications fetched', notifications.map((n) => ({
      _id: n._id.toString(),
      title: n.title,
      body: n.body,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
    })));
  } catch (err) {
    return serverError(err);
  }
}
