import { auth } from '@/auth';
import { unauthorized, forbidden, notFound, ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Feedback from '@/models/feedback.model';

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/feedback/[id]
 * Mark feedback as read. Body: { status: 'read' } or empty.
 * Requires user:read:all (admin).
 */
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const perms = (session.user.permissions as string[] | undefined) ?? [];
  if (!perms.includes('user:read:all')) return forbidden();

  const { id } = await params;

  try {
    await connectDB();
    const feedback = await Feedback.findByIdAndUpdate(
      id,
      { $set: { status: 'read', readAt: new Date() } },
      { returnDocument: 'after' }
    ).lean();

    if (!feedback) return notFound('Feedback not found');

    return ok('Feedback marked as read', {
      _id: feedback._id.toString(),
      status: feedback.status,
      readAt: feedback.readAt?.toISOString() ?? null,
    });
  } catch (err) {
    return serverError(err);
  }
}
