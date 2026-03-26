/**
 * Client-only: merge/transcode recorded parts into a single H.264 MP4
 * (Windows Media Player / phones generally handle MP4 better than glued WebM).
 */
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const FFMPEG_CORE_BASE =
  'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';

let ffmpegSingleton: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

async function getFfmpeg(): Promise<FFmpeg> {
  if (ffmpegSingleton?.loaded) return ffmpegSingleton;
  if (!loadPromise) {
    const ffmpeg = new FFmpeg();
    loadPromise = (async () => {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      ffmpegSingleton = ffmpeg;
      return ffmpeg;
    })();
  }
  return loadPromise;
}

function extForBlob(b: Blob, index: number): string {
  const t = b.type || '';
  if (t.includes('mp4')) return 'mp4';
  if (t.includes('webm')) return 'webm';
  return index === 0 ? 'webm' : 'webm';
}

export type BlobsToMp4Options = {
  /** 0–100; optional label for UI status text */
  onProgress?: (percent: number, detail?: string) => void;
  /** FFmpeg stdout/stderr lines (can be noisy) */
  onLog?: (message: string) => void;
};

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n));
}

/** Build one MP4 from one or more browser-recorded blobs */
export async function blobsToMp4(parts: Blob[], options?: BlobsToMp4Options): Promise<Blob> {
  if (parts.length === 0) {
    throw new Error('No video parts to export');
  }

  const report = (pct: number, detail?: string) => options?.onProgress?.(clampPct(pct), detail);

  if (parts.length === 1 && parts[0].type.includes('mp4') && parts[0].size > 0) {
    report(100, 'Already MP4 — skipping transcode');
    return parts[0];
  }

  report(4, 'Loading video encoder (first time may download ~30MB)…');
  const ff = await getFfmpeg();
  report(16, 'Encoder ready');

  const onLog = (ev: { type: string; message: string }) => {
    const line = `[${ev.type}] ${ev.message}`.trim();
    options?.onLog?.(line);
  };
  const onFfmpegProgress = (ev: { progress: number; time: number }) => {
    const p = typeof ev.progress === 'number' && !Number.isNaN(ev.progress) ? ev.progress : 0;
    report(clampPct(28 + p * 62), 'Encoding video…');
  };
  ff.on('log', onLog);
  ff.on('progress', onFfmpegProgress);

  const names: string[] = [];
  try {
    for (let i = 0; i < parts.length; i++) {
      const ext = extForBlob(parts[i], i);
      const name = `part${i}.${ext}`;
      names.push(name);
      const span = parts.length > 0 ? 12 / parts.length : 12;
      report(16 + (i + 0.5) * span, `Preparing segment ${i + 1} of ${parts.length}…`);
      await ff.writeFile(name, await fetchFile(parts[i]));
      report(16 + (i + 1) * span, `Saved segment ${i + 1} of ${parts.length}`);
    }

    let code: number;
    if (parts.length === 1) {
      const n = names[0];
      report(28, 'Starting encode (this may take a while)…');
      code = await ff.exec(
        [
          '-i',
          n,
          '-c:v',
          'libx264',
          '-preset',
          'medium',
          '-crf',
          '18',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          '-movflags',
          '+faststart',
          'out.mp4',
        ],
        600_000
      );
    } else {
      const listBody = names.map((n) => `file '${n}'`).join('\n');
      await ff.writeFile('concat.txt', listBody);
      report(28, 'Concatenating and encoding…');
      code = await ff.exec(
        [
          '-f',
          'concat',
          '-safe',
          '0',
          '-i',
          'concat.txt',
          '-c:v',
          'libx264',
          '-preset',
          'medium',
          '-crf',
          '18',
          '-pix_fmt',
          'yuv420p',
          '-c:a',
          'aac',
          '-b:a',
          '192k',
          '-movflags',
          '+faststart',
          'out.mp4',
        ],
        900_000
      );
    }

    if (code !== 0) {
      throw new Error(
        `ffmpeg failed (exit ${code}). Check the technical log below; common causes: timeout, corrupt segment, or blocked CDN.`
      );
    }

    report(94, 'Reading output file…');
    const out = await ff.readFile('out.mp4');
    const buf =
      typeof out === 'string' ? new TextEncoder().encode(out) : new Uint8Array(out);
    report(100, 'Done');
    return new Blob([buf], { type: 'video/mp4' });
  } finally {
    ff.off('log', onLog);
    ff.off('progress', onFfmpegProgress);
    for (const n of names) {
      try {
        await ff.deleteFile(n);
      } catch {
        /* ignore */
      }
    }
    try {
      await ff.deleteFile('concat.txt');
    } catch {
      /* ignore */
    }
    try {
      await ff.deleteFile('out.mp4');
    } catch {
      /* ignore */
    }
  }
}
