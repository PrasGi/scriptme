import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth-session';
import { unauthorized, forbidden, badRequest, ok } from '@/lib/response';
import { getTikTokTranscript } from '@/lib/tiktok';
import { logger } from '@/lib/logger';
import { checkActionLimit, incrementActionUsage } from '@/lib/subscription';

/**
 * POST /api/tiktok/transcript
 * Body: { url: string; lang?: string }
 * Authenticated users; plan limit applies (admins with role:read:all bypass limit).
 */
export async function POST(req: Request) {
  const session = await getAuthSession();
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

  // Normalize: trim and strip trailing punctuation (e.g. pasted "url," or "url.")
  const normalizedUrl = url.trim().replace(/[,;\s.]+$/, '');
  if (!normalizedUrl) return badRequest('url is required');

  // Must be a TikTok video URL (profile links like /@user don't have transcript)
  if (!normalizedUrl.includes('tiktok.com')) return badRequest('URL must be a TikTok video URL');
  if (!normalizedUrl.includes('/video/')) {
    return badRequest('Use a video URL: tiktok.com/@username/video/123... (not a profile link)');
  }

  try {
    // #region agent log
    fetch('http://127.0.0.1:7444/ingest/41f18561-93f4-4bf7-95f1-47f94826092a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a096b4'},body:JSON.stringify({sessionId:'a096b4',location:'route.ts:38',message:'TikTok transcript attempt',data:{urlLen:normalizedUrl.length,urlPrefix:normalizedUrl.slice(0,60),lang},hypothesisId:'H1',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const result = await getTikTokTranscript(normalizedUrl, lang);

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
    // User-friendly message for known TikTok parsing failures
    const msg = err instanceof Error ? err.message : '';
    const isRehydrationError = msg.includes('__UNIVERSAL_DATA_FOR_REHYDRATION__');
    const isStructureError = msg.includes('webapp.video-detail') || msg.includes('itemStruct');
    // #region agent log
    fetch('http://127.0.0.1:7444/ingest/41f18561-93f4-4bf7-95f1-47f94826092a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a096b4'},body:JSON.stringify({sessionId:'a096b4',location:'route.ts:69',message:'TikTok transcript catch',data:{errMessage:msg.slice(0,200),isRehydrationError,isStructureError},hypothesisId:'H1,H2,H3,H4',timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const friendlyMessage = isRehydrationError || isStructureError
      ? 'TikTok returned a page we couldn\'t parse. The video may be private, region-locked, or TikTok may have changed their site. Try another video or try again later.'
      : msg || 'Failed to fetch transcript';
    return NextResponse.json(
      { success: false, message: friendlyMessage },
      { status: 422 }
    );
  }
}
