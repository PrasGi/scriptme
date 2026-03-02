import { auth } from '@/auth';
import { connectDB } from '@/lib/db';
import { ok, unauthorized, serverError } from '@/lib/response';
import User from '@/models/user.model';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  try {
    await connectDB();
    const user = await User.findById(session.user.id).select('tutorialCompleted').lean();
    return ok('OK', { tutorialCompleted: user?.tutorialCompleted ?? false });
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH() {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  try {
    await connectDB();
    await User.findByIdAndUpdate(session.user.id, { tutorialCompleted: true });
    return ok('Tutorial marked as completed');
  } catch (err) {
    return serverError(err);
  }
}
