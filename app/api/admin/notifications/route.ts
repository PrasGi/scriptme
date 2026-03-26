import { getAuthSession } from '@/lib/auth-session';
import { unauthorized, forbidden, badRequest, created, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Notification from '@/models/notification.model';
import User from '@/models/user.model';
import mongoose from 'mongoose';

/**
 * POST /api/admin/notifications
 * Admin sends notification to all users or specific user IDs.
 * Requires user:read:all (admin).
 */
export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const perms = session.user.permissions ?? [];
  if (!perms.includes('user:read:all')) return forbidden();

  let body: { title?: string; body?: string; target?: 'all' | 'users'; userIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { title, body: bodyText = '', target = 'all', userIds = [] } = body;

  if (!title || typeof title !== 'string' || !title.trim()) {
    return badRequest('title is required');
  }

  try {
    await connectDB();

    let recipientIds: mongoose.Types.ObjectId[];

    if (target === 'users' && Array.isArray(userIds) && userIds.length > 0) {
      recipientIds = userIds
        .filter((id: unknown) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id))
        .map((id: string) => new mongoose.Types.ObjectId(id));
      const existing = await User.find({ _id: { $in: recipientIds }, deletedAt: null }).select('_id').lean();
      recipientIds = existing.map((u) => u._id);
    } else {
      const users = await User.find({ deletedAt: null }).select('_id').lean();
      recipientIds = users.map((u) => u._id);
    }

    if (recipientIds.length === 0) {
      return badRequest('No recipients found');
    }

    const createdBy = new mongoose.Types.ObjectId(session.user.id);
    const docs = recipientIds.map((userId) => ({
      userId,
      title: title.trim(),
      body: bodyText.trim(),
      readAt: null,
      createdBy,
    }));

    await Notification.insertMany(docs);

    return created('Notifications sent', {
      count: docs.length,
      recipients: recipientIds.length,
    });
  } catch (err) {
    return serverError(err);
  }
}
