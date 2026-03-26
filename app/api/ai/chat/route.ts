import { getAuthSession } from '@/lib/auth-session';
import { unauthorized, badRequest, forbidden } from '@/lib/response';
import { runAgent, createAiSession, type AiMode } from '@/lib/ai-agent';
import { connectDB } from '@/lib/db';
import AiChatLog from '@/models/ai-chat-log.model';
import { computeUsage } from '@/lib/ai-cost';
import { logger } from '@/lib/logger';
import { checkFeatureAccess, checkTokenLimit, getEffectivePlan } from '@/lib/subscription';

/**
 * POST /api/ai/chat
 * Streams an AI response as Server-Sent Events (text/event-stream).
 * Persists each interaction to AiChatLog for usage tracking.
 *
 * Body:
 *   sessionId        — from POST /api/ai/session
 *   message          — user's prompt
 *   mode             — 'generate' | 'analyze' | 'regenerate'
 *   characterContext — optional character style description
 *   scriptContext    — optional current script (HH:MM:SS.mmm --> HH:MM:SS.mmm\nline) for modify
 *   projectId        — optional, for context
 *   scriptId         — optional, for context
 *
 * SSE events:
 *   data: {"chunk":"..."}   — text token
 *   data: {"done":true}     — stream finished
 *   data: {"error":"..."}   — error occurred
 */
export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) return unauthorized();
  const userId = session.user.id;

  let body: {
    sessionId?:        string;
    message?:          string;
    mode?:             AiMode;
    characterContext?: string;
    scriptContext?:    string;
    projectId?:        string;
    scriptId?:         string;
  };

  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { sessionId, message, mode = 'generate', characterContext, scriptContext, projectId, scriptId } = body;

  if (!sessionId) return badRequest('sessionId is required');
  if (!message)   return badRequest('message is required');
  if (!['generate', 'analyze', 'regenerate', 'chat'].includes(mode)) {
    return badRequest('mode must be generate, analyze, regenerate, or chat');
  }

  const hasAccess = await checkFeatureAccess(userId, mode);
  if (!hasAccess) return forbidden('Upgrade your plan to use this feature');

  const plan = await getEffectivePlan(userId);
  const tokenCheck = await checkTokenLimit(userId, plan, 30_000);
  if (!tokenCheck.allowed) return forbidden('Monthly AI token limit reached. Upgrade or wait until next month.');

  const sid = sessionId;
  const msg = message;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = '';

      async function run() {
        const gen = runAgent({
          userId,
          sessionId: sid,
          mode,
          message: msg,
          characterContext,
          scriptContext,
        });
        for await (const chunk of gen) {
          fullResponse += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
        }
      }

      try {
        await run();
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'AI error';
        const isSessionNotFound = typeof errMsg === 'string' && errMsg.includes('Session not found');
        if (isSessionNotFound) {
          try {
            createAiSession(userId, sid);
            fullResponse = '';
            await run();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          } catch (retryErr) {
            const retryMsg = retryErr instanceof Error ? retryErr.message : 'AI error';
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: retryMsg })}\n\n`));
          }
        } else {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
        }
      } finally {
        // Persist to DB and log
        try {
          const usage = computeUsage(msg, fullResponse);
          await connectDB();
          await AiChatLog.create({
            userId,
            sessionId: sid,
            mode,
            message: msg,
            response:         fullResponse,
            characterContext: characterContext ?? undefined,
            projectId:        projectId ?? undefined,
            scriptId:         scriptId ?? undefined,
            ...usage,
          });
          logger.info('AI chat completed', {
            eventType: 'ai.usage',
            resource:  'ai',
            auth:      { userId, roleName: session.user.roleName },
            data:      {
              mode,
              messageLength:  msg.length,
              responseLength: fullResponse.length,
              projectId:      projectId ?? null,
              scriptId:       scriptId ?? null,
            },
          });
        } catch (dbErr) {
          logger.error('Failed to save AI chat log', {
            eventType: 'ai.usage.error',
            auth:      { userId },
            error:     dbErr,
          });
        }
        controller.close();
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
}
