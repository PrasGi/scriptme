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
  Pause,
  Play,
  Undo2,
  ClipboardCopy,
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
type SessionPhase = 'idle' | 'recording' | 'paused';

const ASPECT_PRESETS: { id: VideoAspectPreset; label: string; w: number; h: number }[] = [
  { id: '16:9', label: '16:9', w: 1920, h: 1080 },
  { id: '9:16', label: '9:16', w: 1080, h: 1920 },
  { id: '1:1', label: '1:1', w: 1080, h: 1080 },
  { id: '4:5', label: '4:5', w: 1080, h: 1350 },
];

/** Avoid asking the camera for 4K+ ideals on every machine; canvas still uses full preset size. */
const CAMERA_IDEAL_LONG_EDGE_MAX = 1920;

function clampIdealCaptureSize(width: number, height: number, maxLongEdge: number): { w: number; h: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxLongEdge) return { w: width, h: height };
  const s = maxLongEdge / longEdge;
  return {
    w: Math.round((width * s) / 2) * 2,
    h: Math.round((height * s) / 2) * 2,
  };
}

function captureStreamFrameRateFromTrack(videoTrack: MediaStreamTrack | undefined): number {
  const r = videoTrack?.getSettings?.().frameRate;
  if (typeof r === 'number' && r > 0) {
    return Math.min(60, Math.max(24, Math.round(r)));
  }
  return 60;
}

function videoBitsPerSecondForResolution(width: number, height: number): number {
  const longEdge = Math.max(width, height);
  if (longEdge <= 720) return 6_000_000;
  if (longEdge <= 1280) return 8_000_000;
  if (longEdge <= 1920) return 12_000_000;
  if (longEdge <= 2560) return 20_000_000;
  return 35_000_000;
}

function createMediaRecorderSafe(stream: MediaStream, mime: string, width: number, height: number): MediaRecorder {
  const videoBitsPerSecond = videoBitsPerSecondForResolution(width, height);
  const audioBitsPerSecond = 256_000;
  try {
    return new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond,
      audioBitsPerSecond,
    });
  } catch {
    try {
      return new MediaRecorder(stream, { mimeType: mime });
    } catch {
      return new MediaRecorder(stream);
    }
  }
}

function pickRecorderMime(): string {
  if (typeof MediaRecorder === 'undefined') return 'video/webm';
  /** Prefer MP4 when the browser can record it (better for Windows Media Player). Final export still re-muxes to MP4 when needed. */
  const candidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1.4D401E,mp4a.40.2',
    'video/mp4;codecs=H264',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm',
  ];
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return 'video/webm';
}

function extensionForMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes('mp4')) return 'mp4';
  if (m.includes('webm')) return 'webm';
  return 'mp4';
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

/** Same-codec WebM parts; playback works in many Chromium builds, not guaranteed everywhere */
function mergeSegmentBlobs(parts: Blob[]): Blob {
  if (parts.length === 0) {
    return new Blob([], { type: 'video/webm' });
  }
  const t = parts[0].type || 'video/webm';
  return new Blob(parts, { type: t });
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

async function getCameraStream(idealWidth: number, idealHeight: number): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera is not supported in this browser.');
  }
  const { w, h } = clampIdealCaptureSize(idealWidth, idealHeight, CAMERA_IDEAL_LONG_EDGE_MAX);
  const videoConstraints: MediaTrackConstraints = {
    facingMode: 'user',
    width: { ideal: w },
    height: { ideal: h },
    frameRate: { ideal: 30, max: 60 },
  };
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: videoConstraints,
    });
  } catch {
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
}

export function RecordModeModal({ onClose, title, lines }: RecordModeModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number>(0);
  const teleStartRef = useRef<number>(0);
  const scriptTimeLiveRef = useRef(0);
  const scriptFrozenTimeRef = useRef(0);
  /** Video track from canvas.captureStream for the active segment — stop before next segment */
  const segmentVideoTrackRef = useRef<MediaStreamTrack | null>(null);
  const mimeRef = useRef<string>('video/webm');
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const stopFinalizerRef = useRef<'pause' | 'finish' | null>(null);
  const completedSegmentsRef = useRef<Blob[]>([]);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('idle');
  const [completedSegments, setCompletedSegments] = useState<Blob[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [manualLineIndex, setManualLineIndex] = useState(0);
  const [savedBlob, setSavedBlob] = useState<Blob | null>(null);
  const [exportingMp4, setExportingMp4] = useState(false);
  const [mp4ExportPercent, setMp4ExportPercent] = useState(0);
  const [mp4ExportDetail, setMp4ExportDetail] = useState<string | null>(null);
  const [mp4ExportLogs, setMp4ExportLogs] = useState<string[]>([]);
  const mp4LogBufferRef = useRef<string[]>([]);
  const mp4LogFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [aspectPreset, setAspectPreset] = useState<VideoAspectPreset>('9:16');
  const [mirror, setMirror] = useState(true);
  const [overlayPos, setOverlayPos] = useState({ x: 0.5, y: 0.14 });

  const aspectDims = useMemo(
    () => ASPECT_PRESETS.find((p) => p.id === aspectPreset) ?? ASPECT_PRESETS[1],
    [aspectPreset]
  );

  const hasTimestamps = lines.some((l) => !Number.isNaN(parseTimestampToSeconds(l.startTime)));
  const inSession = sessionPhase !== 'idle';

  useEffect(() => {
    completedSegmentsRef.current = completedSegments;
  }, [completedSegments]);

  useEffect(() => {
    return () => {
      if (mp4LogFlushTimerRef.current) {
        clearTimeout(mp4LogFlushTimerRef.current);
        mp4LogFlushTimerRef.current = null;
      }
    };
  }, []);

  const flushMp4ExportLogs = useCallback(() => {
    if (mp4LogFlushTimerRef.current) {
      clearTimeout(mp4LogFlushTimerRef.current);
      mp4LogFlushTimerRef.current = null;
    }
    const batch = mp4LogBufferRef.current;
    mp4LogBufferRef.current = [];
    if (batch.length === 0) return;
    setMp4ExportLogs((prev) => [...prev, ...batch].slice(-120));
  }, []);

  const appendMp4ExportLog = useCallback(
    (line: string) => {
      const s = line.replace(/\r/g, '').trim();
      if (!s) return;
      mp4LogBufferRef.current.push(s.slice(0, 800));
      if (!mp4LogFlushTimerRef.current) {
        mp4LogFlushTimerRef.current = setTimeout(() => {
          mp4LogFlushTimerRef.current = null;
          const batch = mp4LogBufferRef.current;
          mp4LogBufferRef.current = [];
          if (batch.length === 0) return;
          setMp4ExportLogs((prev) => [...prev, ...batch].slice(-120));
        }, 120);
      }
    },
    []
  );

  const activeIndex =
    hasTimestamps && (sessionPhase === 'recording' || sessionPhase === 'paused')
      ? computeActiveLineIndex(currentTime, lines)
      : Math.min(manualLineIndex, Math.max(0, lines.length - 1));

  const stopTeleprompterRaf = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const stopSegmentVideoTrack = useCallback(() => {
    segmentVideoTrackRef.current?.stop();
    segmentVideoTrackRef.current = null;
  }, []);

  const stopCamera = useCallback(() => {
    stopTeleprompterRaf();
    stopSegmentVideoTrack();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [stopTeleprompterRaf, stopSegmentVideoTrack]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await getCameraStream(aspectDims.w, aspectDims.h);
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
      stopSegmentVideoTrack();
      stopCamera();
      setMediaStream(null);
    };
  }, [aspectDims.h, aspectDims.w, stopCamera, stopSegmentVideoTrack, stopTeleprompterRaf]);

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

  /** Script timeline: runs only while recording (paused = frozen) */
  useEffect(() => {
    if (!hasTimestamps || sessionPhase !== 'recording') return;
    const tick = () => {
      const elapsed = (performance.now() - teleStartRef.current) / 1000;
      setCurrentTime(elapsed);
      scriptTimeLiveRef.current = elapsed;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [hasTimestamps, sessionPhase]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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
    if (sessionPhase !== 'recording') return;
    let raf = 0;
    const loop = () => {
      drawFrame();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [sessionPhase, drawFrame]);

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

  function resetSessionUi() {
    setSessionPhase('idle');
    setCompletedSegments([]);
    scriptTimeLiveRef.current = 0;
    scriptFrozenTimeRef.current = 0;
    setCurrentTime(0);
    setManualLineIndex(0);
  }

  async function finalizeRecordingFromSegmentsAsync(segments: Blob[]) {
    if (segments.length === 0) return;
    if (mp4LogFlushTimerRef.current) {
      clearTimeout(mp4LogFlushTimerRef.current);
      mp4LogFlushTimerRef.current = null;
    }
    mp4LogBufferRef.current = [];
    setMp4ExportPercent(0);
    setMp4ExportDetail(null);
    setMp4ExportLogs([]);
    setExportingMp4(true);
    setCameraError(null);
    appendMp4ExportLog(`Starting export — ${segments.length} section(s), ${segments.reduce((n, b) => n + b.size, 0)} bytes (approx) input`);
    try {
      const { blobsToMp4 } = await import('@/lib/merge-recordings-to-mp4');
      const out = await blobsToMp4(segments, {
        onProgress: (pct, detail) => {
          setMp4ExportPercent(pct);
          if (detail) setMp4ExportDetail(detail);
        },
        onLog: appendMp4ExportLog,
      });
      flushMp4ExportLogs();
      if (mp4LogFlushTimerRef.current) {
        clearTimeout(mp4LogFlushTimerRef.current);
        mp4LogFlushTimerRef.current = null;
      }
      mp4LogBufferRef.current = [];
      setMp4ExportLogs([]);
      mimeRef.current = 'video/mp4';
      setSavedBlob(out);
      setMp4ExportPercent(100);
      setMp4ExportDetail('Done');
      setStatusHint(
        segments.length > 1
          ? `Combined ${segments.length} sections into one MP4 on this device (not uploaded). First-time export downloads a small encoder (~25MB) from the CDN.`
          : 'Exported as MP4 on this device only (not uploaded). On iPhone: Share → Save Video to add to Photos if needed.'
      );
    } catch (err) {
      console.error(err);
      flushMp4ExportLogs();
      const message =
        err instanceof Error
          ? err.message
          : 'MP4 export failed. Check your internet (first run downloads ffmpeg) or try a shorter recording.';
      setCameraError(`MP4 export failed: ${message}`);
      appendMp4ExportLog(`ERROR: ${message}`);
      if (err instanceof Error && err.stack) {
        err.stack.split('\n').forEach((ln) => appendMp4ExportLog(ln.trim()));
      }
      flushMp4ExportLogs();
      const merged = mergeSegmentBlobs(segments);
      if (merged.size > 0) {
        mimeRef.current = merged.type || 'video/webm';
        setSavedBlob(merged);
        setStatusHint(
          'Saved as WebM fallback — Windows Media Player may not play it; try Films & TV, VLC, or rename the file to end in .webm'
        );
      }
    } finally {
      flushMp4ExportLogs();
      setExportingMp4(false);
      resetSessionUi();
    }
  }

  function handleRecorderStopped() {
    const mode = stopFinalizerRef.current;
    stopFinalizerRef.current = null;

    const blob = new Blob(chunksRef.current, { type: mimeRef.current || 'video/webm' });
    chunksRef.current = [];
    stopSegmentVideoTrack();
    recorderRef.current = null;

    if (!mode) return;

    if (mode === 'pause') {
      setCompletedSegments((prev) => [...prev, blob]);
      setSessionPhase('paused');
      if (hasTimestamps) {
        setCurrentTime(scriptFrozenTimeRef.current);
        scriptTimeLiveRef.current = scriptFrozenTimeRef.current;
      }
      return;
    }

    if (mode === 'finish') {
      setCompletedSegments((prev) => {
        const all = [...prev, blob];
        void finalizeRecordingFromSegmentsAsync(all);
        return [];
      });
    }
  }

  function beginSegmentRecorder(): boolean {
    if (typeof MediaRecorder === 'undefined') return false;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !streamRef.current || !video?.videoWidth) {
      setCameraError('Camera is not ready yet. Try again in a moment.');
      return false;
    }

    stopSegmentVideoTrack();
    drawFrame();
    const camVideoTrack = streamRef.current.getVideoTracks()[0];
    const streamFps = captureStreamFrameRateFromTrack(camVideoTrack);
    const canvasStream = canvas.captureStream(streamFps);
    const vTrack = canvasStream.getVideoTracks()[0];
    segmentVideoTrackRef.current = vTrack;
    const combined = new MediaStream([vTrack, ...streamRef.current.getAudioTracks()]);

    chunksRef.current = [];
    const rec = createMediaRecorderSafe(combined, mimeRef.current, aspectDims.w, aspectDims.h);
    recorderRef.current = rec;

    rec.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunksRef.current.push(ev.data);
    };

    rec.onerror = () => {
      setCameraError('Recording failed.');
    };

    rec.onstop = () => {
      handleRecorderStopped();
    };

    rec.start(250);
    return true;
  }

  function handleStartRecording() {
    if (exportingMp4) return;
    if (typeof MediaRecorder === 'undefined') {
      setCameraError('Recording is not supported in this browser.');
      return;
    }
    mimeRef.current = pickRecorderMime();
    if (!beginSegmentRecorder()) return;

    setSavedBlob(null);
    setStatusHint(null);
    setCameraError(null);
    setSessionPhase('recording');
    stopFinalizerRef.current = null;

    scriptFrozenTimeRef.current = 0;
    scriptTimeLiveRef.current = 0;
    teleStartRef.current = performance.now();
    setCurrentTime(0);

    if (!hasTimestamps) {
      setManualLineIndex(0);
    }
  }

  function handlePauseRecording() {
    if (exportingMp4) return;
    const rec = recorderRef.current;
    if (!rec || rec.state !== 'recording') return;

    if (hasTimestamps) {
      scriptFrozenTimeRef.current = scriptTimeLiveRef.current;
    }
    stopTeleprompterRaf();
    stopFinalizerRef.current = 'pause';
    rec.stop();
  }

  function handleContinueRecording() {
    if (exportingMp4 || sessionPhase !== 'paused') return;
    if (!beginSegmentRecorder()) return;

    stopFinalizerRef.current = null;
    teleStartRef.current = performance.now() - scriptFrozenTimeRef.current * 1000;
    if (hasTimestamps) {
      setCurrentTime(scriptFrozenTimeRef.current);
      scriptTimeLiveRef.current = scriptFrozenTimeRef.current;
    }
    setSessionPhase('recording');
  }

  function handleFinishRecording() {
    if (exportingMp4 || sessionPhase === 'idle') return;

    if (sessionPhase === 'paused') {
      if (completedSegmentsRef.current.length === 0) {
        resetSessionUi();
        return;
      }
      void finalizeRecordingFromSegmentsAsync(completedSegmentsRef.current);
      return;
    }

    const rec = recorderRef.current;
    if (!rec || rec.state !== 'recording') return;

    if (hasTimestamps) {
      scriptFrozenTimeRef.current = scriptTimeLiveRef.current;
    }
    stopTeleprompterRaf();
    stopFinalizerRef.current = 'finish';
    rec.stop();
  }

  function handleUndoLastSection() {
    if (exportingMp4 || sessionPhase !== 'paused' || completedSegments.length === 0) return;
    setCompletedSegments((prev) => prev.slice(0, -1));
  }

  function downloadBlob() {
    if (!savedBlob) return;
    const ext = extensionForMime(savedBlob.type || mimeRef.current || 'video/mp4');
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
    const ext = extensionForMime(savedBlob.type || mimeRef.current || 'video/mp4');
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
          className="relative flex flex-1 flex-col min-h-0 min-w-0 w-full overflow-hidden [container-type:size]"
        >
          {/*
            Laptop/wide screens: avoid w-full + aspect-ratio + max-h-full fighting (becomes a wide strip).
            Size = min(container width, height * aspectW/aspectH) so 1:1 stays square, 9:16 stays portrait, etc.
          */}
          <div className="absolute inset-0 z-0 flex h-full min-h-0 w-full items-center justify-center px-3 py-3 pointer-events-none">
            <div
              className="relative mx-auto max-h-full min-h-0 overflow-hidden bg-black pointer-events-auto"
              style={{
                aspectRatio: `${aspectDims.w} / ${aspectDims.h}`,
                width: `min(100cqw, calc(100cqh * ${aspectDims.w} / ${aspectDims.h}))`,
                maxWidth: '100%',
                maxHeight: '100%',
              }}
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
                    disabled={inSession}
                    onClick={() => setAspectPreset(p.id)}
                    className={cn(
                      'h-8 min-w-[2.75rem] rounded-md px-2.5 text-xs font-medium transition-colors',
                      aspectPreset === p.id
                        ? 'bg-white text-black'
                        : 'bg-white/10 text-white/80 hover:bg-white/15',
                      inSession && 'opacity-40'
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
              disabled={inSession}
              aria-pressed={mirror}
              aria-label={mirror ? 'Mirror on' : 'Mirror off'}
              className={cn(
                'mx-auto flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors sm:mx-0',
                mirror
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white/80 hover:bg-white/15',
                inSession && 'pointer-events-none opacity-40'
              )}
            >
              <FlipHorizontal size={14} aria-hidden />
              Mirror
            </button>
          </div>

          {inSession && (
            <p className="text-center text-[11px] text-white/45">
              {sessionPhase === 'paused' && completedSegments.length > 0
                ? `${completedSegments.length} section${completedSegments.length !== 1 ? 's' : ''} saved — Continue adds another`
                : sessionPhase === 'recording'
                  ? 'Recording… Pause freezes the script timer'
                  : null}
            </p>
          )}

          {(exportingMp4 || mp4ExportLogs.length > 0) && (
            <div className="mx-auto w-full max-w-md space-y-2 rounded-lg border border-amber-500/35 bg-amber-950/25 px-3 py-3">
              {exportingMp4 && (
                <>
                  <div
                    className="h-2.5 w-full overflow-hidden rounded-full bg-white/10"
                    role="progressbar"
                    aria-label="Export progress"
                    aria-valuenow={Math.round(mp4ExportPercent)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-violet-500 transition-[width] duration-300 ease-out"
                      style={{ width: `${Math.min(100, Math.max(1, mp4ExportPercent))}%` }}
                    />
                  </div>
                  <p className="text-center text-xs text-amber-100/95">{mp4ExportDetail ?? 'Working…'}</p>
                  <p className="text-center text-[11px] leading-relaxed text-white/45">
                    Building MP4 in your browser. First run may download an encoder (~30&nbsp;MB). Keep this tab
                    open — long clips can take several minutes.
                  </p>
                </>
              )}
              {mp4ExportLogs.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-white/45">
                      Technical log
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(mp4ExportLogs.join('\n'));
                        } catch {
                          /* clipboard may be blocked without gesture */
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/10 px-2 py-1 text-[11px] text-white/90 hover:bg-white/15"
                    >
                      <ClipboardCopy size={12} aria-hidden />
                      Copy log
                    </button>
                  </div>
                  <pre className="max-h-44 overflow-auto rounded-md border border-white/10 bg-black/50 p-2 text-[10px] leading-snug font-mono text-white/70 [overflow-wrap:anywhere] whitespace-pre-wrap">
                    {mp4ExportLogs.join('\n')}
                  </pre>
                </div>
              )}
            </div>
          )}

          {sessionPhase === 'idle' ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handleStartRecording}
                disabled={exportingMp4 || !cameraReady || !videoReady || !!cameraError}
                className="flex items-center gap-2 h-11 px-6 rounded-lg bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#6D28D9] disabled:opacity-40"
              >
                <RecordDot size={14} />
                Start recording
              </button>
            </div>
          ) : sessionPhase === 'recording' ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handlePauseRecording}
                disabled={exportingMp4}
                className="flex items-center gap-2 h-11 px-5 rounded-lg bg-white/15 text-white text-sm font-medium hover:bg-white/20 disabled:opacity-40"
              >
                <Pause size={16} fill="currentColor" />
                Pause
              </button>
              <button
                type="button"
                onClick={handleFinishRecording}
                disabled={exportingMp4}
                className="flex items-center gap-2 h-11 px-5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-40"
              >
                <Square size={14} fill="currentColor" />
                Finish
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleContinueRecording}
                  disabled={exportingMp4}
                  className="flex items-center gap-2 h-11 px-5 rounded-lg bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#6D28D9] disabled:opacity-40"
                >
                  <Play size={16} fill="currentColor" />
                  Continue
                </button>
                <button
                  type="button"
                  onClick={handleUndoLastSection}
                  disabled={exportingMp4 || completedSegments.length === 0}
                  className="flex items-center gap-2 h-11 px-5 rounded-lg border border-white/20 bg-white/5 text-white text-sm font-medium hover:bg-white/10 disabled:opacity-40"
                >
                  <Undo2 size={16} aria-hidden />
                  Undo section
                </button>
                <button
                  type="button"
                  onClick={handleFinishRecording}
                  disabled={exportingMp4}
                  className="flex items-center gap-2 h-11 px-5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-40"
                >
                  <Square size={14} fill="currentColor" />
                  Finish
                </button>
              </div>
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
                  disabled={exportingMp4}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-white/95 disabled:opacity-40"
                >
                  <Download size={16} />
                  Save / Download
                </button>
                {canShareFile && (
                  <button
                    type="button"
                    onClick={shareBlob}
                    disabled={exportingMp4}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15 disabled:opacity-40"
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