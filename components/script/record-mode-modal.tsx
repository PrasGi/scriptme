'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  Square,
  Video,
  Share2,
  Download,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  FlipHorizontal,
} from 'lucide-react';
import { cn, stripHtml } from '@/lib/utils';
import { parseTimestampToSeconds } from '@/lib/parse-script';
import type { ScriptLine } from '@/models/script.model';

interface RecordModeModalProps {
  onClose: () => void;
  title: string;
  lines: ScriptLine[];
}

type VideoAspectPreset = '16:9' | '9:16' | '1:1' | '4:5';

const ASPECT_PRESETS: { id: VideoAspectPreset; label: string; w: number; h: number }[] = [
  { id: '16:9', label: '16:9', w: 1920, h: 1080 },
  { id: '9:16', label: '9:16', w: 1080, h: 1920 },
  { id: '1:1', label: '1:1', w: 1080, h: 1080 },
  { id: '4:5', label: '4:5', w: 1080, h: 1350 },
];

function pickRecorderMime(): string {
  if (typeof MediaRecorder === 'undefined') return 'video/webm';
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm',
    'video/mp4',
  ];
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return 'video/webm';
}

function extensionForMime(mime: string): string {
  if (mime.includes('mp4')) return 'mp4';
  return 'webm';
}

function safeFilenameBase(title: string): string {
  const t = title.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return t || 'script-recording';
}

function computeActiveLineIndex(currentTime: number, scriptLines: ScriptLine[]): number {
  if (scriptLines.length === 0) return -1;
  let idx = -1;
  for (let i = 0; i < scriptLines.length; i++) {
    const start = parseTimestampToSeconds(scriptLines[i].startTime);
    const end = parseTimestampToSeconds(scriptLines[i].endTime);
    if (currentTime >= start && currentTime < end) {
      idx = i;
      break;
    }
    if (currentTime < start) break;
    idx = i;
  }
  return idx;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Prefer front camera; fall back for desktop / emulators where facingMode can fail */
async function getCameraStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera is not supported in this browser.');
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { facingMode: 'user' },
    });
  } catch {
    return await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
  }
}

export function RecordModeModal({ onClose, title, lines }: RecordModeModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** Full preview strip (area above bottom bar) — drag script anywhere here */
  const previewRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number>(0);
  const teleStartRef = useRef<number>(0);
  const mimeRef = useRef<string>('video/webm');
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [teleprompterPlaying, setTeleprompterPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [manualLineIndex, setManualLineIndex] = useState(0);
  const [savedBlob, setSavedBlob] = useState<Blob | null>(null);
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [aspectPreset, setAspectPreset] = useState<VideoAspectPreset>('9:16');
  const [mirror, setMirror] = useState(true);
  /** Normalized center in previewRef (0–1) — default top-center; can sit outside camera frame */
  const [overlayPos, setOverlayPos] = useState({ x: 0.5, y: 0.14 });

  const aspectDims = useMemo(
    () => ASPECT_PRESETS.find((p) => p.id === aspectPreset) ?? ASPECT_PRESETS[1],
    [aspectPreset]
  );

  const hasTimestamps = lines.some((l) => !Number.isNaN(parseTimestampToSeconds(l.startTime)));

  const activeIndex =
    hasTimestamps && teleprompterPlaying
      ? computeActiveLineIndex(currentTime, lines)
      : Math.min(manualLineIndex, Math.max(0, lines.length - 1));

  const stopTeleprompterRaf = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const stopCamera = useCallback(() => {
    stopTeleprompterRaf();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [stopTeleprompterRaf]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await getCameraStream();
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        setMediaStream(stream);
        setCameraError(null);
        setCameraReady(true);
      } catch (e) {
        if (!cancelled) {
          setCameraError(
            e instanceof Error ? e.message : 'Could not access camera or microphone.'
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      stopTeleprompterRaf();
      try {
        if (recorderRef.current && recorderRef.current.state === 'recording') {
          recorderRef.current.stop();
        }
      } catch {
        /* ignore */
      }
      recorderRef.current = null;
      chunksRef.current = [];
      stopCamera();
      setMediaStream(null);
    };
  }, [stopCamera, stopTeleprompterRaf]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.srcObject = mediaStream;
    v.muted = true;
    if (mediaStream) {
      void v.play().catch(() => {});
    } else {
      queueMicrotask(() => setVideoReady(false));
    }
  }, [mediaStream]);

  useEffect(() => {
    if (!teleprompterPlaying || !recording) return;
    const tick = () => {
      const elapsed = (performance.now() - teleStartRef.current) / 1000;
      setCurrentTime(elapsed);
      rafRef.current = requestAnimationFrame(tick);
    };
    teleStartRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [teleprompterPlaying, recording]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /** Recorded output: camera only (no script, no REC badge) */
  const drawFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw < 2 || vh < 2) return;

    const cw = aspectDims.w;
    const ch = aspectDims.h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = cw;
    canvas.height = ch;

    const videoAspect = vw / vh;
    const targetAspect = cw / ch;
    let sx = 0;
    let sy = 0;
    let sww = vw;
    let shh = vh;
    if (videoAspect > targetAspect) {
      sww = vh * targetAspect;
      sx = (vw - sww) / 2;
    } else {
      shh = vw / targetAspect;
      sy = (vh - shh) / 2;
    }

    if (mirror) {
      ctx.save();
      ctx.translate(cw, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, sww, shh, 0, 0, cw, ch);
      ctx.restore();
    } else {
      ctx.drawImage(video, sx, sy, sww, shh, 0, 0, cw, ch);
    }
  }, [aspectDims, mirror]);

  useEffect(() => {
    if (!recording) return;
    let raf = 0;
    const loop = () => {
      drawFrame();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [recording, drawFrame]);

  function onOverlayPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: overlayPos.x,
      originY: overlayPos.y,
    };
  }

  function onOverlayPointerMove(e: React.PointerEvent) {
    if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
    const box = previewRef.current?.getBoundingClientRect();
    if (!box || box.width < 1 || box.height < 1) return;
    const dx = (e.clientX - dragRef.current.startX) / box.width;
    const dy = (e.clientY - dragRef.current.startY) / box.height;
    setOverlayPos({
      x: clamp(dragRef.current.originX + dx, 0.02, 0.98),
      y: clamp(dragRef.current.originY + dy, 0.02, 0.98),
    });
  }

  function onOverlayPointerUp(e: React.PointerEvent) {
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
    }
  }

  async function handleStartRecording() {
    if (typeof MediaRecorder === 'undefined') {
      setCameraError('Recording is not supported in this browser.');
      return;
    }
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !streamRef.current || !video?.videoWidth) {
      setCameraError('Camera is not ready yet. Try again in a moment.');
      return;
    }

    drawFrame();
    const mime = pickRecorderMime();
    mimeRef.current = mime;

    const canvasStream = canvas.captureStream(30);
    const audioTracks = streamRef.current.getAudioTracks();
    const combined = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ]);

    chunksRef.current = [];
    const rec = new MediaRecorder(combined, { mimeType: mime });
    recorderRef.current = rec;

    rec.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunksRef.current.push(ev.data);
    };

    rec.onerror = () => {
      setCameraError('Recording failed.');
    };

    rec.start(250);
    setRecording(true);
    setSavedBlob(null);
    setStatusHint(null);

    if (hasTimestamps) {
      setTeleprompterPlaying(true);
      teleStartRef.current = performance.now();
      setCurrentTime(0);
    } else {
      setTeleprompterPlaying(false);
      setManualLineIndex(0);
    }
  }

  function handleStopRecording() {
    const rec = recorderRef.current;
    if (!rec || rec.state === 'inactive') {
      setRecording(false);
      setTeleprompterPlaying(false);
      return;
    }

    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeRef.current || 'video/webm' });
      setSavedBlob(blob);
      chunksRef.current = [];
      setRecording(false);
      setTeleprompterPlaying(false);
      setStatusHint(
        'Video saved on this device only (not uploaded). On iPhone: use Share → Save Video to add to Photos, or check the Files app.'
      );
    };

    rec.stop();
    recorderRef.current = null;
  }

  function downloadBlob() {
    if (!savedBlob) return;
    const ext = extensionForMime(savedBlob.type || mimeRef.current);
    const name = `${safeFilenameBase(title)}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${ext}`;
    const url = URL.createObjectURL(savedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function shareBlob() {
    if (!savedBlob) return;
    const ext = extensionForMime(savedBlob.type || mimeRef.current);
    const name = `${safeFilenameBase(title)}.${ext}`;
    const file = new File([savedBlob], name, { type: savedBlob.type || 'video/webm' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: name });
      } catch {
        /* user cancelled */
      }
    }
  }

  const canShareFile = useMemo(() => {
    if (!savedBlob || typeof navigator === 'undefined' || !navigator.canShare) return false;
    try {
      const mime = savedBlob.type || 'video/webm';
      const ext = extensionForMime(mime);
      const name = `${safeFilenameBase(title)}.${ext}`;
      const file = new File([savedBlob], name, { type: mime });
      return navigator.canShare({ files: [file] });
    } catch {
      return false;
    }
  }, [savedBlob, title]);

  return (
    <div className="fixed inset-0 z-60 flex flex-col bg-black">
      <div className="relative flex-1 flex flex-col min-h-0">
        <div className="shrink-0 flex items-center justify-between gap-3 border-b border-white/10 bg-black px-4 py-3">
          <div className="flex items-center gap-2 min-w-0 text-white">
            <Video size={18} className="text-[#7C3AED] shrink-0" />
            <span className="text-sm font-medium truncate">Record</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-md text-white/70 hover:text-white hover:bg-white/10"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div
          ref={previewRef}
          className="relative flex flex-1 flex-col min-h-0 min-w-0 w-full overflow-hidden"
        >
          {/* Centered camera frame (recording matches this crop only) */}
          <div className="absolute inset-0 z-0 flex items-center justify-center px-3 py-3 pointer-events-none">
            <div
              className="relative w-full max-h-full min-h-0 overflow-hidden bg-black pointer-events-auto"
              style={{ aspectRatio: `${aspectDims.w} / ${aspectDims.h}` }}
            >
              <video
                ref={videoRef}
                className="absolute inset-0 size-full object-cover bg-black"
                style={{ transform: mirror ? 'scaleX(-1)' : 'none' }}
                playsInline
                muted
                autoPlay
                onLoadedMetadata={() => setVideoReady(true)}
                onCanPlay={() => setVideoReady(true)}
              />
              <canvas
                ref={canvasRef}
                className="pointer-events-none absolute inset-0 size-full opacity-0"
                aria-hidden
              />
            </div>
          </div>

          {/* Script: viewer-only, draggable over entire preview area */}
          <div
            className={cn(
              'absolute z-20 w-[min(92%,22rem)] max-h-[min(55vh,55%)] overflow-y-auto rounded-lg border border-white/20 bg-black/45 px-3 py-3',
              'cursor-grab active:cursor-grabbing touch-none'
            )}
            style={{
              left: `${overlayPos.x * 100}%`,
              top: `${overlayPos.y * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
            onPointerDown={onOverlayPointerDown}
            onPointerMove={onOverlayPointerMove}
            onPointerUp={onOverlayPointerUp}
            onPointerCancel={onOverlayPointerUp}
          >
            <div className="mb-2 flex items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wide text-white/40">
              <GripVertical size={12} className="shrink-0" aria-hidden />
              <span>Drag — not recorded</span>
            </div>
            {cameraError ? (
              <p className="text-center text-sm text-red-400">{cameraError}</p>
            ) : lines.length === 0 ? (
              <p className="text-sm text-center text-white/50">No script lines.</p>
            ) : (
              <>
                <div className="space-y-2 text-center">
                  {[0, 1, 2].map((offset) => {
                    const i = (activeIndex >= 0 ? activeIndex : 0) + offset;
                    if (i >= lines.length) return null;
                    const plain = stripHtml(lines[i].text);
                    return (
                      <p
                        key={i}
                        className={cn(
                          'leading-relaxed',
                          offset === 0
                            ? 'text-base font-semibold text-white sm:text-lg'
                            : 'text-xs text-white/55 sm:text-sm'
                        )}
                      >
                        {plain || '—'}
                      </p>
                    );
                  })}
                </div>

                {!hasTimestamps && lines.length > 0 && (
                  <div className="mt-3 flex justify-center gap-2 border-t border-white/10 pt-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setManualLineIndex((idx) => Math.max(0, idx - 1));
                      }}
                      className="flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] text-white/90 hover:bg-white/10"
                    >
                      <ChevronLeft size={14} /> Prev
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setManualLineIndex((idx) => Math.min(lines.length - 1, idx + 1));
                      }}
                      className="flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] text-white/90 hover:bg-white/10"
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div
          className="shrink-0 border-t border-white/10 bg-black px-4 py-4 flex flex-col gap-3"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-[10px] uppercase tracking-wide text-white/35">Ratio</span>
              <div className="flex flex-wrap justify-center gap-1">
                {ASPECT_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={recording}
                    onClick={() => setAspectPreset(p.id)}
                    className={cn(
                      'h-8 min-w-[2.75rem] rounded-md px-2.5 text-xs font-medium transition-colors',
                      aspectPreset === p.id
                        ? 'bg-white text-black'
                        : 'bg-white/10 text-white/80 hover:bg-white/15',
                      recording && 'opacity-40'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMirror((m) => !m)}
              aria-pressed={mirror}
              aria-label={mirror ? 'Mirror on' : 'Mirror off'}
              className={cn(
                'mx-auto flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors sm:mx-0',
                mirror
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white/80 hover:bg-white/15'
              )}
            >
              <FlipHorizontal size={14} aria-hidden />
              Mirror
            </button>
          </div>

          {!recording ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleStartRecording}
                disabled={!cameraReady || !videoReady || !!cameraError}
                className="flex items-center gap-2 h-11 px-6 rounded-lg bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#6D28D9] disabled:opacity-40"
              >
                <RecordDot size={14} />
                Start recording
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleStopRecording}
                className="flex items-center gap-2 h-11 px-6 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"
              >
                <Square size={14} fill="currentColor" />
                Stop recording
              </button>
            </div>
          )}

          {savedBlob && (
            <div className="rounded-lg border border-white/15 bg-white/[0.03] p-4 space-y-3">
              <p className="text-xs text-white/65">
                Recording ready. Save a copy to your device (no upload from this step).
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={downloadBlob}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white/95"
                >
                  <Download size={16} />
                  Save / Download
                </button>
                {canShareFile && (
                  <button
                    type="button"
                    onClick={shareBlob}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15"
                  >
                    <Share2 size={16} />
                    Share
                  </button>
                )}
              </div>
              {statusHint && (
                <p className="text-[11px] leading-relaxed text-white/45">{statusHint}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecordDot({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="text-red-500" aria-hidden>
      <circle cx="12" cy="12" r="8" fill="currentColor" />
    </svg>
  );
}
