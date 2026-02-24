import { auth } from '@/auth';
import { unauthorized, forbidden, ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Feedback from '@/models/feedback.model';

/**
 * GET /api/admin/feedback
 * List all feedback. Query: status=unread|read|all (default all).
 * Requires user:read:all (admin).
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const perms = (session.user.permissions as string[] | undefined) ?? [];
  if (!perms.includes('user:read:all')) return forbidden();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') ?? 'all';

  try {
    await connectDB();

    const filter = status === 'all' ? {} : { status };
    const list = await Feedback.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'name email')
      .lean();

    const data = list.map((f) => {
      const u = f.userId as { _id?: unknown; name?: string; email?: string } | null;
      const isPopulated = u && typeof u === 'object' && 'name' in u;
      return {
        _id: f._id.toString(),
        userId: isPopulated && u._id ? String(u._id) : String(f.userId),
        userName: isPopulated ? (u.name ?? '') : '',
        userEmail: isPopulated ? (u.email ?? '') : '',
        message: f.message,
        status: f.status,
        readAt: f.readAt ? f.readAt.toISOString() : null,
        createdAt: f.createdAt.toISOString(),
      };
    });

    return ok('Feedback list', data);
  } catch (err) {
    return serverError(err);
  }
}
