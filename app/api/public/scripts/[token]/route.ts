import { notFound, ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Script from '@/models/script.model';

type Params = { params: Promise<{ token: string }> };

/**
 * GET /api/public/scripts/[token]
 * Fetch a script by its public share token (no auth required).
 */
export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;

  try {
    await connectDB();
    const script = await Script.findOne({
      shareToken: token,
      deletedAt: null,
    })
      .select('title lines plainText status createdAt updatedAt')
      .lean();

    if (!script) return notFound('Script not found or link expired');

    return ok('Script fetched', {
      title: script.title,
      lines: script.lines,
      status: script.status,
      createdAt: script.createdAt,
      updatedAt: script.updatedAt,
    });
  } catch (err) {
    return serverError(err);
  }
}
