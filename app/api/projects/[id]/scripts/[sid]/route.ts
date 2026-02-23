import { auth } from '@/auth';
import { unauthorized, notFound, badRequest, ok, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Script from '@/models/script.model';
import type { ScriptLine, ScriptStatus } from '@/models/script.model';

type Params = { params: Promise<{ id: string; sid: string }> };

/**
 * GET /api/projects/[id]/scripts/[sid]
 * Get a single script.
 */
export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id: projectId, sid } = await params;

  try {
    await connectDB();
    const script = await Script.findOne({
      _id:       sid,
      projectId,
      userId:    session.user.id,
      deletedAt: null,
    }).lean();

    if (!script) return notFound('Script not found');
    return ok('Script fetched', script);
  } catch (err) {
    return serverError(err);
  }
}

/**
 * PATCH /api/projects/[id]/scripts/[sid]
 * Update a script's content or metadata.
 */
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id: projectId, sid } = await params;

  let body: {
    title?:         string;
    lines?:         ScriptLine[];
    plainText?:     string;
    status?:        ScriptStatus;
    characterId?:   string | null;
    analyzeResult?: unknown[] | null;
  };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  try {
    await connectDB();
    const script = await Script.findOneAndUpdate(
      { _id: sid, projectId, userId: session.user.id, deletedAt: null },
      {
        $set: {
          ...(body.title       !== undefined && { title:       body.title.trim() }),
          ...(body.lines       !== undefined && { lines:       body.lines }),
          ...(body.plainText   !== undefined && { plainText:   body.plainText }),
          ...(body.status      !== undefined && { status:      body.status }),
          ...(body.characterId   !== undefined && { characterId:   body.characterId ?? null }),
          ...(body.analyzeResult !== undefined && { analyzeResult: body.analyzeResult ?? null }),
        },
      },
      { new: true }
    ).lean();

    if (!script) return notFound('Script not found');
    return ok('Script updated', script);
  } catch (err) {
    return serverError(err);
  }
}

/**
 * DELETE /api/projects/[id]/scripts/[sid]
 * Soft-delete a script.
 */
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id: projectId, sid } = await params;

  try {
    await connectDB();
    const script = await Script.findOneAndUpdate(
      { _id: sid, projectId, userId: session.user.id, deletedAt: null },
      { $set: { deletedAt: new Date() } },
      { new: true }
    ).lean();

    if (!script) return notFound('Script not found');
    return ok('Script deleted');
  } catch (err) {
    return serverError(err);
  }
}
