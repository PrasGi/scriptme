'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Search, Copy, Check, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface TranscriptResponse {
  videoId:     string;
  author:      string;
  description: string;
  language:    string;
  transcript:  string;
  subtitles:   { language: string; name: string; format: string }[];
  raw:         string;
}

export default function TranscriptTestPage() {
  const [url,       setUrl]       = useState('');
  const [lang,      setLang]      = useState('');
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState<TranscriptResponse | null>(null);
  const [error,     setError]     = useState('');
  const [showRaw,   setShowRaw]   = useState(false);
  const [copied,    setCopied]    = useState(false);

  async function handleFetch(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const res  = await fetch('/api/tiktok/transcript', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: url.trim(), lang }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.message ?? 'Failed to fetch transcript');
      } else {
        setResult(json.data);
      }
    } catch {
      setError('Network error — check your Cloudflare worker URLs in .env.local');
    } finally {
      setLoading(false);
    }
  }

  async function copyTranscript() {
    if (!result?.transcript) return;
    await navigator.clipboard.writeText(result.transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText size={22} className="text-[#06B6D4]" />
          TikTok Transcript Test
        </h1>
        <p className="text-sm text-[#8B949E] mt-0.5">
          Fetch captions / transcript from a TikTok video via Cloudflare proxy workers
        </p>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-white/[0.06] bg-[#0D1117] p-5 space-y-4">
        <form onSubmit={handleFetch} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#8B949E] uppercase tracking-wider">TikTok Video URL</label>
            <Input
              placeholder="https://www.tiktok.com/@user/video/1234567890"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="bg-[#161B22] border-white/[0.08] font-mono text-sm"
            />
          </div>

          <div className="flex items-end gap-3">
            <div className="space-y-1.5 flex-1 max-w-[160px]">
              <label className="text-xs font-medium text-[#8B949E] uppercase tracking-wider">Preferred Language</label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-[#161B22] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#06B6D4]/50"
              >
                <option value="">Auto</option>
                <option value="eng">English (eng)</option>
                <option value="ind">Indonesian (ind)</option>
                <option value="jpn">Japanese (jpn)</option>
                <option value="kor">Korean (kor)</option>
                <option value="zho">Chinese (zho)</option>
                <option value="spa">Spanish (spa)</option>
                <option value="por">Portuguese (por)</option>
              </select>
            </div>
            <Button variant="cyan" type="submit" disabled={loading || !url.trim()} className="gap-2">
              <Search size={14} />
              {loading ? 'Fetching…' : 'Fetch Transcript'}
            </Button>
          </div>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Meta */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0D1117] p-5 space-y-3">
            <h2 className="text-sm font-semibold text-white">Video Info</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-[#8B949E]">Video ID</span>
                <p className="text-white font-mono mt-0.5">{result.videoId || '—'}</p>
              </div>
              <div>
                <span className="text-[#8B949E]">Author</span>
                <p className="text-white mt-0.5">@{result.author || '—'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-[#8B949E]">Description</span>
                <p className="text-white mt-0.5 line-clamp-2">{result.description || '—'}</p>
              </div>
              <div>
                <span className="text-[#8B949E]">Transcript Language</span>
                <p className="text-white font-mono mt-0.5">{result.language}</p>
              </div>
              <div>
                <span className="text-[#8B949E]">Available Captions</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {result.subtitles.map((s) => (
                    <span key={s.language} className="px-2 py-0.5 rounded-md bg-[#06B6D4]/10 text-[#06B6D4] text-xs font-mono border border-[#06B6D4]/20">
                      {s.language}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Transcript */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0D1117] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
              <h2 className="text-sm font-semibold text-white">Transcript</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyTranscript}
                className="gap-1.5 text-xs text-[#8B949E] hover:text-white"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
            <div className="p-5">
              <p className="text-sm text-[#E6EDF3] leading-relaxed whitespace-pre-wrap">
                {result.transcript || 'No transcript text found.'}
              </p>
            </div>
          </div>

          {/* Raw VTT toggle */}
          <div className="rounded-2xl border border-white/[0.06] bg-[#0D1117] overflow-hidden">
            <button
              onClick={() => setShowRaw((v) => !v)}
              className="flex items-center justify-between w-full px-5 py-3 text-sm text-[#8B949E] hover:text-white transition-colors"
            >
              <span>Raw VTT / SRT</span>
              {showRaw ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
            {showRaw && (
              <div className="border-t border-white/[0.06] p-5">
                <pre className="text-xs text-[#8B949E] font-mono overflow-x-auto whitespace-pre-wrap">
                  {result.raw}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
