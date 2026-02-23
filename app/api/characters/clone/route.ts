import { auth } from '@/auth';
import { unauthorized, badRequest, forbidden, created, serverError } from '@/lib/response';
import { connectDB } from '@/lib/db';
import Character from '@/models/character.model';
import AiChatLog from '@/models/ai-chat-log.model';
import { getTikTokTranscript } from '@/lib/tiktok';
import { runAgent, createAiSession } from '@/lib/ai-agent';
import { computeUsage } from '@/lib/ai-cost';
import { checkFeatureAccess, checkTokenLimit, getEffectivePlan } from '@/lib/subscription';
import { randomUUID } from 'crypto';

/**
 * POST /api/characters/clone
 * Clone a character from a TikTok video transcript.
 * Body: { url: string, lang?: string }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  let body: { url?: string; lang?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { url, lang = 'eng' } = body;
  if (!url || typeof url !== 'string' || !url.trim()) {
    return badRequest('url is required');
  }
  if (!url.includes('tiktok.com')) {
    return badRequest('URL must be a TikTok video URL');
  }

  const hasAccess = await checkFeatureAccess(session.user.id, 'clone');
  if (!hasAccess) return forbidden('Upgrade your plan to use character clone');

  const plan = await getEffectivePlan(session.user.id);
  const tokenCheck = await checkTokenLimit(session.user.id, plan, 30_000);
  if (!tokenCheck.allowed) return forbidden('Monthly AI token limit reached. Upgrade or wait until next month.');

  try {
    const result = await getTikTokTranscript(url.trim(), lang);

    const sessionId = randomUUID();
    createAiSession(session.user.id, sessionId);

    const transcriptText = result.transcript || result.raw || '';
    if (!transcriptText.trim()) {
      return badRequest('No transcript content found for this video');
    }

    let fullResponse = '';
    const gen = runAgent({
      userId:    session.user.id,
      sessionId,
      mode:      'clone',
      message:   `[TRANSCRIPT]\n${transcriptText.slice(0, 15000)}`,
    });

    for await (const chunk of gen) {
      fullResponse += chunk;
    }

    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return serverError(new Error('AI did not return valid JSON'));
    }

    const parsed = JSON.parse(jsonMatch[0]) as { name?: string; description?: string; platform?: string };
    const name = typeof parsed.name === 'string' ? parsed.name.trim() : `${result.meta.author} Style`;
    const description = typeof parsed.description === 'string' ? parsed.description.trim() : transcriptText.slice(0, 500);
    const platform = ['tiktok', 'youtube', 'instagram'].includes(String(parsed.platform || '').toLowerCase())
      ? (parsed.platform as 'tiktok' | 'youtube' | 'instagram')
      : 'tiktok';

    await connectDB();
    const message = `[TRANSCRIPT]\n${transcriptText.slice(0, 15000)}`;
    const usage = computeUsage(message, fullResponse);
    await AiChatLog.create({
      userId:        session.user.id,
      sessionId,
      mode:          'clone',
      message,
      response:      fullResponse,
      inputTokens:   usage.inputTokens,
      outputTokens:  usage.outputTokens,
      totalTokens:   usage.totalTokens,
      costUsd:       usage.costUsd,
    });
    const character = await Character.create({
      userId:        session.user.id,
      name:          name || `${result.meta.author} Style`,
      description:   description || 'Writing style extracted from video transcript.',
      platform,
      sourceType:    'cloned',
      sourceUrl:     url.trim(),
      sourceAuthor:  result.meta.author,
      sourceVideoId: result.meta.id,
      accentColor:   '#06B6D4',
    });

    return created('Character cloned', character.toObject());
  } catch (err) {
    return serverError(err);
  }
}
