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
 * POST /api/projects/[id]/scripts/[sid]/implement
 * Implement a single analyze suggestion via AI. Streams response, does not affect chat UI.
 * Body: { lineIndex: number, suggestion: string, text: string, scriptContext: string }
 */
export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const { id: projectId, sid } = await params;

  let body: { lineIndex?: number; suggestion?: string; text?: string; scriptContext?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { lineIndex, suggestion, text, scriptContext } = body;
  if (
    typeof lineIndex !== 'number' ||
    !suggestion ||
    typeof suggestion !== 'string' ||
    !text ||
    typeof text !== 'string'
  ) {
    return badRequest('lineIndex, suggestion, and text are required');
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
    if (script.characterId) {
      const char = await Character.findById(script.characterId).lean();
      if (char?.description) characterContext = char.description;
    }

    const ctx = scriptContext ?? '';
    const message = `Implement this suggestion for line ${lineIndex + 1}: "${suggestion}". The current line text is: "${text}". Current full script:\n${ctx}\n\nReturn ONLY the full modified script in timestamp format (HH:MM:SS.mmm --> HH:MM:SS.mmm\\nline text), with your change applied. No other text.`;

    const sessionId = randomUUID();
    createAiSession(session.user.id, sessionId);

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
            scriptContext:    ctx || undefined,
          });

          for await (const chunk of gen) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }

          const parsedLines = parseScriptLines(fullResponse);
          const existingLines = script.lines ?? [];
          const mergedLines = parsedLines.map((line, i) => {
            const existing = existingLines[i];
            return {
              ...line,
              flagColor: existing?.flagColor ?? line.flagColor,
            };
          });
          const plainText = mergedLines.map((l) => l.text).join(' ');
          await Script.findByIdAndUpdate(sid, {
            $set: { lines: mergedLines, plainText, status: 'ready', sourceType: 'ai' },
          });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'AI error';
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
          controller.close();
        } finally {
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
            logger.info('AI implement completed', {
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
        'Content-Type':   'text/event-stream',
        'Cache-Control':  'no-cache',
        Connection:       'keep-alive',
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
