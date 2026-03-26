import { getAuthSession } from '@/lib/auth-session';
import { unauthorized, forbidden, notFound, badRequest, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import { checkFeatureAccess, checkTokenLimit, checkActionLimit, incrementActionUsage, getEffectivePlan } from '@/lib/subscription';
import Script from '@/models/script.model';
import Character from '@/models/character.model';
import { getAnalyzeQueue } from '@/lib/queue';

type Params = { params: Promise<{ id: string; sid: string }> };

type ScriptLine = { startTime: string; endTime: string; text: string };

/**
 * POST /api/projects/[id]/scripts/[sid]/analyze
 * Enqueue a script analysis job. Returns immediately with jobId.
 * A BullMQ worker processes the job in the background and updates the script in DB.
 * Client should poll GET /api/projects/[id]/scripts/[sid] until status is 'ready'.
 *
 * Body: { lines?: ScriptLine[]; characterId?: string } — use current lines and optionally the character selected in the UI (for style consistency).
 */
export async function POST(req: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();

  const { id: projectId, sid } = await params;

  let bodyLines: ScriptLine[] | undefined;
  let bodyCharacterId: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (Array.isArray(body.lines) && body.lines.length > 0) {
      bodyLines = body.lines;
    }
    if (typeof body.characterId === 'string' && body.characterId) {
      bodyCharacterId = body.characterId;
    }
  } catch { /* ignore */ }

  const hasAccess = await checkFeatureAccess(session.user.id, 'analyze');
  if (!hasAccess) return forbidden('Upgrade your plan to use script analysis');
  const plan = await getEffectivePlan(session.user.id);
  const tokenCheck = await checkTokenLimit(session.user.id, plan, 50_000);
  if (!tokenCheck.allowed) return forbidden('Monthly AI token limit reached. Upgrade or wait until next month.');

  const analyzeLimitCheck = await checkActionLimit(session.user.id, 'analyze');
  if (!analyzeLimitCheck.allowed) return forbidden('Monthly limit for analyze reached. Upgrade or wait until next month.');

  try {
    await connectDB();
    const script = await Script.findOne({
      _id:       sid,
      projectId,
      userId:    session.user.id,
      deletedAt: null,
    }).populate<{ characterId: { description: string } | null }>('characterId', 'description');
    if (!script) return notFound('Script not found');

    const linesToAnalyze = bodyLines ?? script.lines;
    const plainFallback = script.plainText;
    if (linesToAnalyze.length === 0 && !plainFallback) {
      return badRequest('Script has no content to analyze');
    }

    const scriptContent = linesToAnalyze.length > 0
      ? linesToAnalyze.map((l) => `${l.startTime} --> ${l.endTime}\n${l.text}`).join('\n\n')
      : plainFallback;

    let characterContext: string | undefined;
    if (bodyCharacterId) {
      const char = await Character.findOne({
        _id:    bodyCharacterId,
        userId: session.user.id,
        deletedAt: null,
      }).select('description').lean();
      if (char?.description) characterContext = char.description;
    }
    if (characterContext === undefined) {
      const scriptChar = script.characterId as { description?: string } | null;
      characterContext = scriptChar?.description ?? undefined;
    }

    await Script.findByIdAndUpdate(sid, { $set: { status: 'analyzing' } });

    const queue = getAnalyzeQueue();
    const job = await queue.add(
      'analyze',
      {
        scriptId:         sid,
        projectId,
        userId:           session.user.id,
        scriptContent,
        characterContext,
      },
      { jobId: `analyze-${sid}-${Date.now()}` }
    );

    await incrementActionUsage(session.user.id, 'analyze');

    return Response.json({
      success: true,
      message: 'Analysis job queued',
      data:    { jobId: job.id },
    });
  } catch (err) {
    return serverError(err);
  }
}
