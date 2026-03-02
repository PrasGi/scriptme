# `lib/tiktok.ts` — TikTok Transcript Library

Utilities for extracting transcripts from TikTok videos using TikTok's own embedded caption data — no third-party AI, no audio transcription.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Types](#types)
- [Functions](#functions)
  - [getTikTokTranscript](#gettiktoktranscript) ← main entry point
  - [fetchTikTokPage](#fetchtiktokpage)
  - [extractVideoData](#extractvideodata)
  - [fetchSubtitleFile](#fetchsubtitlefile)
  - [parseVTT](#parsevtt)
- [Error Reference](#error-reference)
- [Limitations](#limitations)
- [Planned: Whisper Fallback](#planned-whisper-fallback)

---

## How It Works

```
TikTok URL
    │
    ▼
[Worker 2] ──── mimics Chrome browser ────► TikTok HTML page
    │
    ▼
extractVideoData()
    │  parses <script id="__UNIVERSAL_DATA_FOR_REHYDRATION__">
    │  navigates: __DEFAULT_SCOPE__ → webapp.video-detail
    │                               → itemInfo.itemStruct
    │                               → video.subtitleInfos[]
    │
    ▼
SubtitleInfo[]  (CDN URLs to .vtt / .srt files)
    │
    ▼  pick preferred language (fallback: first available)
    │
[Worker 1] ──── general proxy ────────────► raw VTT / SRT text
    │
    ▼
parseVTT()
    │  strips: WEBVTT header, timestamps, sequence numbers,
    │          inline cue tags, blank lines, duplicate lines
    ▼
Plain transcript string
```

---

## Prerequisites

Two Cloudflare Workers must be deployed before using this library:

| Worker | Purpose | Env var |
|---|---|---|
| **Worker 1** — general proxy | Fetches any URL, returns body + Content-Type | `CLOUDFLARE_PROXY_URL` |
| **Worker 2** — TikTok proxy | Same as Worker 1 but sends TikTok-specific browser headers to avoid bot-blocking | `CLOUDFLARE_TIKTOK_URL` |

Worker 2 sets the following headers on every outgoing request:
- `User-Agent` — Chrome on Windows (see `docs/tiktok-proxy-worker.js` for a ready-to-deploy script)
- `Referer: https://www.tiktok.com/`
- `sec-ch-ua`, `sec-ch-ua-mobile`, `sec-ch-ua-platform`
- `Sec-Fetch-Dest`, `Sec-Fetch-Mode`, `Sec-Fetch-Site`

---

## Environment Variables

Add to `.env.local`:

```env
# Worker 1 — general proxy (already deployed)
CLOUDFLARE_PROXY_URL=https://proxy-scraper.yourname.workers.dev

# Worker 2 — TikTok-specific proxy (new)
CLOUDFLARE_TIKTOK_URL=https://tiktok-proxy.yourname.workers.dev
```

---

## Types

### `SubtitleInfo`

Represents one caption track available for a video.

```typescript
interface SubtitleInfo {
  languageCode: string;  // ISO 639 code, e.g. 'eng', 'ind', 'jpn-JP'
  languageName: string;  // Human-readable, e.g. 'English', 'Indonesian'
  url:          string;  // CDN URL to the .vtt or .srt file
  format:       string;  // 'webvtt' | 'srt'
}
```

### `TikTokVideoMeta`

Video metadata extracted from the page JSON.

```typescript
interface TikTokVideoMeta {
  id:          string;          // TikTok video ID
  description: string;          // Video caption / desc text
  author:      string;          // Creator's @username
  playAddr:    string;          // Signed CDN video URL (expires)
  subtitles:   SubtitleInfo[];  // Available caption tracks
}
```

> `playAddr` is a signed URL that expires. It is included for potential future use (e.g. Whisper fallback). Do not cache it.

### `TranscriptResult`

Return type of the main `getTikTokTranscript()` function.

```typescript
interface TranscriptResult {
  meta:       TikTokVideoMeta;  // Full video metadata
  transcript: string;           // Plain text, ready to use
  language:   string;           // Language code of the fetched caption
  raw:        string;           // Original VTT/SRT content (before parsing)
}
```

---

## Functions

### `getTikTokTranscript`

**Main entry point.** Orchestrates all steps and returns the complete result.

```typescript
async function getTikTokTranscript(
  tiktokVideoUrl: string,
  preferredLang?: string  // ISO 639-2 code, default: 'eng'
): Promise<TranscriptResult>
```

**Parameters:**

| Name | Type | Default | Description |
|---|---|---|---|
| `tiktokVideoUrl` | `string` | — | Full TikTok video URL, e.g. `https://www.tiktok.com/@user/video/123` |
| `preferredLang` | `string` | `'eng'` | ISO 639-2 language code to prefer. If not found, falls back to the first available language. |

**Language code examples:**

| Code | Language |
|---|---|
| `eng` | English |
| `ind` | Indonesian |
| `jpn` | Japanese |
| `kor` | Korean |
| `zho` | Chinese |
| `spa` | Spanish |
| `por` | Portuguese |

**Example:**

```typescript
import { getTikTokTranscript } from '@/lib/tiktok';

const result = await getTikTokTranscript(
  'https://www.tiktok.com/@someuser/video/7340000000000000000',
  'eng'
);

console.log(result.transcript);
// → "so today I want to talk about something really important..."

console.log(result.language);
// → "eng-US"

console.log(result.meta.author);
// → "someuser"

console.log(result.meta.subtitles);
// → [{ languageCode: 'eng-US', languageName: 'English', url: '...', format: 'webvtt' }]
```

**Throws:**
- `'CLOUDFLARE_TIKTOK_URL is not configured'` — missing env var
- `'CLOUDFLARE_PROXY_URL is not configured'` — missing env var
- `'Could not find __UNIVERSAL_DATA_FOR_REHYDRATION__ ...'` — TikTok changed their HTML structure, or Worker 2 returned an error page
- `'webapp.video-detail not found in JSON scope'` — JSON structure changed
- `'No subtitles/captions found for this video.'` — video has no captions enabled

---

### `fetchTikTokPage`

Fetches the raw HTML of a TikTok video page through Worker 2.

```typescript
async function fetchTikTokPage(tiktokVideoUrl: string): Promise<string>
```

Worker 2 sends proper browser headers so TikTok returns the full page with embedded JSON instead of a bot-detection page.

**Throws:**
- `'CLOUDFLARE_TIKTOK_URL is not configured'`
- `'Worker 2 returned {status}: ...'` — proxy request failed

---

### `extractVideoData`

Parses the `__UNIVERSAL_DATA_FOR_REHYDRATION__` script tag from raw HTML and extracts video metadata + subtitle list.

```typescript
function extractVideoData(html: string): TikTokVideoMeta
```

**JSON path navigated:**

```
json
  .__DEFAULT_SCOPE__
    .['webapp.video-detail']   (or 'webapp.rehydration' fallback)
      .itemInfo
        .itemStruct
          .id           → video ID
          .desc         → description
          .author
            .uniqueId   → @username
          .video
            .playAddr   → video CDN URL
            .subtitleInfos[]
              .LanguageCodeName → languageCode
              .LanguageID       → languageName
              .Url              → subtitle CDN URL
              .Format           → 'webvtt' | 'srt'
```

**Throws:**
- `'Could not find __UNIVERSAL_DATA_FOR_REHYDRATION__ script tag in page HTML'`
- `'webapp.video-detail not found in JSON scope'`
- `'itemStruct not found in video detail'`

---

### `fetchSubtitleFile`

Fetches a subtitle file (VTT or SRT) from a CDN URL through Worker 1.

```typescript
async function fetchSubtitleFile(subtitleUrl: string): Promise<string>
```

Worker 1 is used here (not Worker 2) because subtitle CDN URLs only require basic proxy — no TikTok-specific headers needed.

**Throws:**
- `'CLOUDFLARE_PROXY_URL is not configured'`
- `'Worker 1 returned {status} fetching subtitle'`

---

### `parseVTT`

Strips all VTT/SRT metadata from caption text and returns a clean plain-text string.

```typescript
function parseVTT(vtt: string): string
```

**What gets stripped:**

| Pattern | Example |
|---|---|
| Header | `WEBVTT` |
| Sequence numbers | `1`, `2`, `42` |
| Timestamp lines | `00:00:01.000 --> 00:00:04.200` |
| Inline cue tags | `<00:00:01.000>`, `<c>`, `</c>` |
| VTT directives | `NOTE`, `STYLE`, `REGION` |
| Blank lines | — |
| Consecutive duplicates | TikTok sometimes repeats the same line in overlapping cues |

**Input:**
```
WEBVTT

1
00:00:01.000 --> 00:00:04.200
<00:00:01.000><c>so today I want to</c>

2
00:00:04.200 --> 00:00:07.800
<c>talk about something important</c>
```

**Output:**
```
so today I want to talk about something important
```

> `parseVTT` is designed to be reusable. When the Whisper fallback is implemented, Whisper's `.vtt` output can be passed directly into this function.

---

## Error Reference

| Error message | Cause | Fix |
|---|---|---|
| `CLOUDFLARE_TIKTOK_URL is not configured` | Missing env var | Add `CLOUDFLARE_TIKTOK_URL` to `.env.local` |
| `CLOUDFLARE_PROXY_URL is not configured` | Missing env var | Add `CLOUDFLARE_PROXY_URL` to `.env.local` |
| `Worker 2 returned 4xx/5xx` | Worker 2 crashed or TikTok blocked | Check Worker 2 logs in Cloudflare dashboard |
| `Could not find __UNIVERSAL_DATA_FOR_REHYDRATION__` | Worker returned error page / TikTok changed HTML | Inspect raw HTML returned by Worker 2 |
| `webapp.video-detail not found` | TikTok changed internal JSON structure | Update the key path in `extractVideoData()` |
| `itemStruct not found` | Same as above | Same fix |
| `No subtitles/captions found` | Creator disabled captions, or video is private/deleted | Nothing to extract — see Whisper Fallback section |

---

## Limitations

1. **Captions must exist** — If a creator hasn't enabled captions and TikTok's auto-caption hasn't run, there is nothing to extract. `subtitleInfos` will be empty.

2. **Private / deleted videos** — Worker 2 will return a login wall or 404 page. The `__UNIVERSAL_DATA_FOR_REHYDRATION__` extraction will fail.

3. **TikTok JSON structure changes** — TikTok occasionally changes their internal JSON paths. If scraping breaks, inspect the raw HTML and update the key path in `extractVideoData()`.

4. **Signed CDN URLs expire** — `playAddr` and subtitle URLs are signed and time-limited. Always fetch them fresh; do not persist the URLs.

5. **Cloudflare free tier limits** — 100,000 requests/day per worker. Subtitle files are small (< 50KB), so this is rarely a concern.

---

## Planned: Whisper Fallback

When a video has no captions, the plan is to fall back to self-hosted [faster-whisper](https://github.com/SYSTRAN/faster-whisper):

```
meta.subtitles.length === 0
    │
    ▼
Use meta.playAddr  (via Worker 1 proxy)
    │
    ▼
POST to Whisper server → returns .vtt
    │
    ▼
parseVTT()  ← same function, no changes needed
    │
    ▼
TranscriptResult  ← same shape, source: 'whisper'
```

**New env var when ready:**
```env
WHISPER_API_URL=http://your-whisper-server:8000
```

`parseVTT()` requires no changes — Whisper's WebVTT output is standard format.
