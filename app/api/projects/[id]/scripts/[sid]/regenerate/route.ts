import { auth } from '@/auth';
import { unauthorized, forbidden, notFound, badRequest, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import { checkFeatureAccess, checkTokenLimit, getEffectivePlan } from '@/lib/subscription';
import Script from '@/models/script.model';
import Character from '@/models/character.model';
import AiChatLog from '@/models/ai-chat-log.model';
import { computeUsage } from '@/lib/ai-cost';
import { runAgent, createAiSession } from '@/lib/ai-agent';
import { logger } from '@/lib/logger';
import { randomUUID } from 'crypto';
import { parseScriptLines } from '@/lib/parse-script';

type Params = { params: Promise<{ id: string; sid: string }> };

/**
 * POST /api/projects/[id]/scripts/[sid]/regenerate
 * Regenerate a script using AI based on a user prompt.
 * Streams the response as SSE, then saves the new lines to the script.
 *
 * Body: { prompt: string, sessionId?: string }
 */
export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id: projectId, sid } = await params;

  let body: { prompt?: string; sessionId?: string; characterId?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { prompt, sessionId: existingSessionId, characterId: bodyCharacterId } = body;
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return badRequest('prompt is required');
  }

  const hasAccess = await checkFeatureAccess(session.user.id, 'regenerate');
  if (!hasAccess) return forbidden('Upgrade your plan to use this feature');
  const plan = await getEffectivePlan(session.user.id);
  const tokenCheck = await checkTokenLimit(session.user.id, plan, 30_000);
  if (!tokenCheck.allowed) return forbidden('Monthly AI token limit reached. Upgrade or wait until next month.');

  try {
    await connectDB();
    const script = await Script.findOne({
      _id:       sid,
      projectId,
      userId:    session.user.id,
      deletedAt: null,
    });
    if (!script) return notFound('Script not found');

    let characterContext: string | undefined;
    const charId = bodyCharacterId || script.characterId;
    if (charId) {
      const char = await Character.findById(charId).lean();
      if (char?.description) characterContext = char.description;
    }

    // Build context: existing script + user prompt
    const existingContent = script.lines.length > 0
      ? script.lines.map((l) => `${l.startTime} --> ${l.endTime}\n${l.text}`).join('\n\n')
      : script.plainText;

    const message = existingContent
      ? `Existing script:\n${existingContent}\n\nInstruction: ${prompt.trim()}`
      : prompt.trim();

    // Use provided session or create a one-off one
    const sessionId = existingSessionId ?? randomUUID();
    if (!existingSessionId) {
      createAiSession(session.user.id, sessionId);
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = '';

        try {
          const gen = runAgent({
            userId:           session.user.id,
            sessionId,
            mode:             'regenerate',
            message,
            characterContext,
          });

          for await (const chunk of gen) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }

          // Parse and save the new lines
          const lines     = parseScriptLines(fullResponse);
          const plainText = lines.map((l) => l.text).join(' ');
          await Script.findByIdAndUpdate(sid, {
            $set: { lines, plainText, status: 'ready', sourceType: 'ai', analyzeResult: null },
          });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'AI error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        } finally {
          // Persist AI usage for admin tracking
          try {
            const usage = computeUsage(message, fullResponse);
            await AiChatLog.create({
              userId:    session.user.id,
              sessionId,
              mode:      'regenerate',
              message,
              response:  fullResponse,
              projectId,
              scriptId:  sid,
              ...usage,
            });
            logger.info('AI regenerate completed', {
              eventType: 'ai.usage',
              resource:  'ai',
              auth:      { userId: session.user.id },
              data:      { mode: 'regenerate', projectId, scriptId: sid },
            });
          } catch (dbErr) {
            logger.error('Failed to save AI chat log', { eventType: 'ai.usage.error', error: dbErr });
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
