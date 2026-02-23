import { auth } from '@/auth';
import { unauthorized, forbidden, badRequest, ok, serverError } from '@/lib/response';
import { getTikTokTranscript } from '@/lib/tiktok';
import { logger } from '@/lib/logger';
import { checkActionLimit, incrementActionUsage } from '@/lib/subscription';

/**
 * POST /api/tiktok/transcript
 * Body: { url: string; lang?: string }
 * Authenticated users; plan limit applies (admins with role:read:all bypass limit).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorized();

  const isAdmin = (session.user.permissions ?? []).includes('role:read:all');
  if (!isAdmin) {
    const fetchCheck = await checkActionLimit(session.user.id, 'fetch');
    if (!fetchCheck.allowed) {
      return forbidden('Monthly limit for fetch reached. Upgrade or wait until next month.');
    }
  }

  let body: { url?: string; lang?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  const { url, lang = 'eng' } = body;
  if (!url || typeof url !== 'string') return badRequest('url is required');

  // Basic TikTok URL validation
  if (!url.includes('tiktok.com')) return badRequest('URL must be a TikTok video URL');

  try {
    const result = await getTikTokTranscript(url.trim(), lang);

    if (!isAdmin) {
      await incrementActionUsage(session.user.id, 'fetch');
    }

    logger.info('TikTok transcript fetched', {
      eventType: 'tiktok.transcript',
      auth:      { userId: session.user.id },
      data:      { videoId: result.meta.id, author: result.meta.author, language: result.language },
    });

    return ok('Transcript fetched', {
      videoId:     result.meta.id,
      author:      result.meta.author,
      description: result.meta.description,
      language:    result.language,
      transcript:  result.transcript,
      subtitles:   result.meta.subtitles.map((s) => ({ language: s.languageCode, name: s.languageName, format: s.format })),
      raw:         result.raw,
    });
  } catch (err) {
    logger.error('TikTok transcript failed', {
      eventType: 'tiktok.transcript.error',
      auth:      { userId: session.user.id },
      error:     err,
    });
    return serverError(err);
  }
}
