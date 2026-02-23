/**
 * lib/parse-script.ts
 *
 * Parses AI-generated or VTT-style timestamped script text into ScriptLine[].
 *
 * Supported input format (one block per line):
 *   HH:MM:SS.mmm --> HH:MM:SS.mmm
 *   line text here
 *
 * Also handles plain text (no timestamps) — wraps each line with auto-generated times.
 */

import type { ScriptLine } from '@/models/script.model';

const TIMESTAMP_RE = /^(\d{2}:\d{2}:\d{2}[.,]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[.,]\d{3})/;

/**
 * Parse a raw timestamped script string into ScriptLine[].
 * Falls back to plain-text mode if no timestamps are found.
 */
export function parseScriptLines(raw: string): ScriptLine[] {
  const lines  = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const result: ScriptLine[] = [];

  let i = 0;
  while (i < lines.length) {
    const match = lines[i].match(TIMESTAMP_RE);
    if (match) {
      const startTime = match[1].replace(',', '.');
      const endTime   = match[2].replace(',', '.');
      const textLine  = lines[i + 1] ?? '';
      if (textLine) {
        result.push({ startTime, endTime, text: textLine });
        i += 2;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  // Fallback: if nothing was parsed with timestamps, treat each non-empty line as plain text
  if (result.length === 0) {
    const textLines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    let seconds = 0;
    for (const text of textLines) {
      const duration  = Math.max(1.5, text.length * 0.06); // rough estimate
      const startTime = formatTime(seconds);
      seconds        += duration;
      const endTime   = formatTime(seconds);
      result.push({ startTime, endTime, text });
    }
  }

function formatTime(totalSeconds: number): string {
  const h   = Math.floor(totalSeconds / 3600);
  const m   = Math.floor((totalSeconds % 3600) / 60);
  const s   = Math.floor(totalSeconds % 60);
  const ms  = Math.round((totalSeconds % 1) * 1000);
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}.${pad(ms, 3)}`;
}

  return result;
}

function pad(n: number, len: number): string {
  return String(n).padStart(len, '0');
}

/** Matches timestamp pattern anywhere in text (for hasTimestampedScript) */
const TIMESTAMP_PATTERN = /\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}/;

/**
 * Returns true if the text contains at least one timestamped script block (HH:MM:SS.mmm --> HH:MM:SS.mmm).
 * Use this to avoid showing "Apply to script" for feedback/JSON responses.
 */
export function hasTimestampedScript(raw: string): boolean {
  return TIMESTAMP_PATTERN.test(raw ?? '');
}

/**
 * Parse HH:MM:SS.mmm to total seconds.
 */
export function parseTimestampToSeconds(s: string): number {
  const parts = s.trim().replace(',', '.').split(/[:.]/).map(Number);
  const [h = 0, m = 0, sec = 0, ms = 0] = parts;
  return h * 3600 + m * 60 + sec + ms / 1000;
}

/**
 * Convert seconds to HH:MM:SS.mmm format.
 */
export function formatTime(seconds: number): string {
  const h  = Math.floor(seconds / 3600);
  const m  = Math.floor((seconds % 3600) / 60);
  const s  = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)}.${pad(ms, 3)}`;
}

/**
 * Format a timestamp (HH:MM:SS.mmm) as human-readable, e.g. "0.76 s" or "1m 2.3 s".
 */
export function formatHumanReadableTime(ts: string): string {
  const sec = parseTimestampToSeconds(ts);
  if (Number.isNaN(sec) || sec < 0) return '—';
  if (sec < 60) return `${sec.toFixed(2)} s`;
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(1);
  return `${m}m ${s} s`;
}

/**
 * Compute next start/end timestamps after a given endTime.
 * durationSeconds defaults to 2.
 */
export function getNextTimestamps(prevEndTime: string, durationSeconds = 2): { startTime: string; endTime: string } {
  const startSec = parseTimestampToSeconds(prevEndTime);
  const endSec   = startSec + durationSeconds;
  return { startTime: formatTime(startSec), endTime: formatTime(endSec) };
}
