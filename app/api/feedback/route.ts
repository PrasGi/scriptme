import { auth } from '@/auth';
import { unauthorized, badRequest, created, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Feedback from '@/models/feedback.model';

/**
 * POST /api/feedback
 * Submit feedback from the current user (shown to admin).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) return badRequest('Message is required');

  try {
    await connectDB();
    const feedback = await Feedback.create({
      userId: session.user.id,
      message,
      status: 'unread',
    });
    return created('Feedback submitted', {
      _id: feedback._id.toString(),
      message: feedback.message,
      status: feedback.status,
      createdAt: feedback.createdAt.toISOString(),
    });
  } catch (err) {
    return serverError(err);
  }
}
