import crypto from 'crypto';
import { getAuthSession } from '@/lib/auth-session';
import { unauthorized, notFound, ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Script from '@/models/script.model';

type Params = { params: Promise<{ id: string; sid: string }> };

/**
 * POST /api/projects/[id]/scripts/[sid]/share
 * Generate or revoke a public share token.
 * Body: { enabled: boolean }
 */
export async function POST(req: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const { id: projectId, sid } = await params;

  let body: { enabled?: boolean };
  try {
    body = await req.json();
  } catch {
    body = { enabled: true };
  }

  const enabled = body.enabled !== false;

  try {
    await connectDB();

    if (enabled) {
      const existing = await Script.findOne({
        _id: sid,
        projectId,
        userId: session.user.id,
        deletedAt: null,
      }).lean();

      if (!existing) return notFound('Script not found');

      if (existing.shareToken) {
        return ok('Share link already active', { shareToken: existing.shareToken });
      }

      const token = crypto.randomBytes(20).toString('hex');
      await Script.updateOne({ _id: sid }, { $set: { shareToken: token } });
      return ok('Share link created', { shareToken: token });
    }

    const script = await Script.findOneAndUpdate(
      { _id: sid, projectId, userId: session.user.id, deletedAt: null },
      { $set: { shareToken: null } },
      { returnDocument: 'after' },
    ).lean();

    if (!script) return notFound('Script not found');
    return ok('Share link revoked', { shareToken: null });
  } catch (err) {
    return serverError(err);
  }
}
