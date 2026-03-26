/**
 * lib/tiktok.ts
 *
 * TikTok transcript scraping utilities.
 *
 * Flow:
 *   1. Call Cloudflare Worker 2 (TikTok-tuned proxy) → raw HTML
 *   2. Parse __UNIVERSAL_DATA_FOR_REHYDRATION__ script tag → JSON
 *   3. Extract subtitleInfos from itemStruct → subtitle URLs
 *   4. Call Cloudflare Worker 1 (general proxy) → VTT text
 *   5. Parse VTT → plain transcript string
 *
 * Environment variables required:
 *   CLOUDFLARE_PROXY_URL   – Worker 1 (general proxy, already deployed)
 *   CLOUDFLARE_TIKTOK_URL  – Worker 2 (TikTok-specific proxy, new)
 */

export interface SubtitleInfo {
  languageCode: string;
  languageName: string;
  url:          string;
  format:       string; // 'webvtt' | 'srt' | etc.
}

export interface TikTokVideoMeta {
  id:          string;
  description: string;
  author:      string;
  playAddr:    string;
  subtitles:   SubtitleInfo[];
}

export interface TranscriptResult {
  meta:       TikTokVideoMeta;
  transcript: string;       // plain text from captions
  language:   string;
  raw:        string;       // original VTT/SRT content
}

// ─── Env helpers ──────────────────────────────────────────────────────────────

function proxyUrl()  { return process.env.CLOUDFLARE_PROXY_URL!; }
function tiktokUrl() { return process.env.CLOUDFLARE_TIKTOK_URL!; }

// ─── Step 1: Fetch TikTok page HTML via Worker 2 ─────────────────────────────

export async function fetchTikTokPage(tiktokVideoUrl: string): Promise<string> {
  const worker = tiktokUrl();
  if (!worker) throw new Error('CLOUDFLARE_TIKTOK_URL is not configured');

  const res = await fetch(`${worker}?url=${encodeURIComponent(tiktokVideoUrl)}`);
  const bodyText = await res.text();
  if (!res.ok) {
    throw new Error(`Worker 2 returned ${res.status}: ${bodyText}`);
  }
  return bodyText;
}

// ─── Step 2: Parse JSON blob from HTML ───────────────────────────────────────

export function extractVideoData(html: string): TikTokVideoMeta {
  // Find the script tag with the universal data
  const match = html.match(
    /<script[^>]+id=["']__UNIVERSAL_DATA_FOR_REHYDRATION__["'][^>]*>([\s\S]*?)<\/script>/i
  );
  if (!match?.[1]) {
    throw new Error('Could not find __UNIVERSAL_DATA_FOR_REHYDRATION__ script tag in page HTML');
  }

  const json = JSON.parse(match[1]) as Record<string, unknown>;

  // Navigate to video detail — TikTok 2025/2026 path
  const scope = json['__DEFAULT_SCOPE__'] as Record<string, unknown> | undefined;
  const videoDetail = (
    (scope?.['webapp.video-detail'] as Record<string, unknown>)
    ?? (scope?.['webapp.rehydration'] as Record<string, unknown>)
  );
  if (!videoDetail) throw new Error('webapp.video-detail not found in JSON scope');

  const itemInfo  = videoDetail['itemInfo'] as Record<string, unknown>;
  const itemStruct = (itemInfo?.['itemStruct'] ?? videoDetail['itemStruct']) as Record<string, unknown>;
  if (!itemStruct) throw new Error('itemStruct not found in video detail');

  const video  = itemStruct['video'] as Record<string, unknown>;
  const author = itemStruct['author'] as Record<string, unknown>;

  // Parse subtitles (subtitleInfos array)
  const rawSubs = (video?.['subtitleInfos'] ?? video?.['captions'] ?? []) as Record<string, unknown>[];
  const subtitles: SubtitleInfo[] = rawSubs.map((s) => ({
    languageCode: String(s['LanguageCodeName'] ?? s['languageCode'] ?? 'en'),
    languageName: String(s['LanguageID']       ?? s['languageName'] ?? 'English'),
    url:          String(s['Url']              ?? s['url']          ?? ''),
    format:       String(s['Format']           ?? s['format']       ?? 'webvtt'),
  })).filter((s) => s.url);

  return {
    id:          String(itemStruct['id'] ?? ''),
    description: String(itemStruct['desc'] ?? ''),
    author:      String(author?.['uniqueId'] ?? author?.['nickname'] ?? ''),
    playAddr:    String(video?.['playAddr'] ?? video?.['downloadAddr'] ?? ''),
    subtitles,
  };
}

// ─── Step 3: Fetch a subtitle file via Worker 1 (general proxy) ──────────────

export async function fetchSubtitleFile(subtitleUrl: string): Promise<string> {
  const worker = proxyUrl();
  if (!worker) throw new Error('CLOUDFLARE_PROXY_URL is not configured');

  const res = await fetch(`${worker}?url=${encodeURIComponent(subtitleUrl)}`);
  if (!res.ok) {
    throw new Error(`Worker 1 returned ${res.status} fetching subtitle`);
  }
  return res.text();
}

// ─── Step 4: Parse VTT/SRT → plain text ──────────────────────────────────────

export function parseVTT(vtt: string): string {
  return vtt
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      if (!t)                           return false; // blank
      if (t === 'WEBVTT')               return false; // header
      if (/^\d+$/.test(t))              return false; // sequence numbers (SRT)
      if (/-->/. test(t))               return false; // timestamp lines
      if (t.startsWith('NOTE'))         return false; // VTT comments
      if (t.startsWith('STYLE'))        return false;
      if (t.startsWith('REGION'))       return false;
      return true;
    })
    .map((line) =>
      // Strip inline VTT cue tags like <00:00:01.000>, <c>, etc.
      line.replace(/<[^>]+>/g, '').trim()
    )
    .filter(Boolean)
    // Deduplicate consecutive identical lines (TikTok repeats lines sometimes)
    .filter((line, i, arr) => line !== arr[i - 1])
    .join(' ');
}

// ─── Main: Get transcript from a TikTok URL ───────────────────────────────────

export async function getTikTokTranscript(
  tiktokVideoUrl: string,
  preferredLang = 'eng' // ISO 639 code, e.g. 'eng', 'ind', 'jpn'
): Promise<TranscriptResult> {
  // 1. Fetch page
  const html = await fetchTikTokPage(tiktokVideoUrl);

  // Detect TikTok login/WAF page (Slardar) — return clearer error than generic "couldn't parse"
  if (!html.includes('__UNIVERSAL_DATA_FOR_REHYDRATION__') && (html.includes('SlardarWAF') || html.includes('tiktok_web_login'))) {
    throw new Error('TikTok returned a login or security page instead of the video. Your request may be blocked; try again later or use a different network.');
  }

  // 2. Extract metadata + subtitle list
  const meta = extractVideoData(html);

  if (meta.subtitles.length === 0) {
    throw new Error('No subtitles/captions found for this video. The video may not have captions enabled.');
  }

  // 3. Pick preferred language, fall back to first available
  const subtitle =
    meta.subtitles.find((s) => s.languageCode.toLowerCase().startsWith(preferredLang)) ??
    meta.subtitles[0];

  // 4. Fetch subtitle file
  const raw = await fetchSubtitleFile(subtitle.url);

  // 5. Parse to plain text
  const transcript = parseVTT(raw);

  return {
    meta,
    transcript,
    language: subtitle.languageCode,
    raw,
  };
}
