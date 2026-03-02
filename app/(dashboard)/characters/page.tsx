'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CharacterCard } from '@/components/dashboard/character-card';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { Plus, Link2, Search, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const LANG_OPTIONS = [
  { value: '', label: 'Auto' },
  { value: 'eng', label: 'English' },
  { value: 'ind', label: 'Indonesian' },
  { value: 'jpn', label: 'Japanese' },
  { value: 'kor', label: 'Korean' },
  { value: 'zho', label: 'Chinese' },
] as const;

interface Character {
  _id:          string;
  name:         string;
  description:  string;
  platform:     string;
  sourceType:   'cloned' | 'custom';
  sourceUrl?:   string;
  sourceAuthor?: string;
  accentColor:  string;
}

export default function CharactersPage() {
  const router = useRouter();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'all' | 'cloned' | 'custom'>('all');

  const [cloneUrl, setCloneUrl] = useState('');
  const [cloneLang, setCloneLang] = useState('');
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState('');
  const [langOpen, setLangOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    if (langOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [langOpen]);

  useEffect(() => {
    fetch('/api/characters')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setCharacters(json.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleClone(e: React.FormEvent) {
    e.preventDefault();
    if (!cloneUrl.trim() || cloning) return;

    setCloning(true);
    setCloneError('');

    try {
      const res = await fetch('/api/characters/clone', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ url: cloneUrl.trim(), lang: cloneLang || undefined }),
      });
      const json = await res.json();

      if (!json.success) {
        setCloneError(json.message ?? 'Failed to clone');
      } else {
        setCharacters((prev) => [json.data, ...prev]);
        setCloneUrl('');
      }
    } catch {
      setCloneError('Network error — please try again');
    } finally {
      setCloning(false);
    }
  }

  const filtered = characters.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.description ?? '').toLowerCase().includes(search.toLowerCase());
    const matchTab =
      tab === 'all' ||
      (tab === 'cloned' && c.sourceType === 'cloned') ||
      (tab === 'custom' && c.sourceType === 'custom');
    return matchSearch && matchTab;
  });

  const clonedCount = characters.filter((c) => c.sourceType === 'cloned').length;
  const customCount = characters.filter((c) => c.sourceType === 'custom').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Characters</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Creator styles you&apos;ve cloned and custom characters
          </p>
        </div>
        <Tooltip content="Create Custom" description="Add a character with your own style description" side="left">
          <Button
            variant="accent"
            size="md"
            className="gap-2"
            onClick={() => router.push('/characters/new')}
          >
            <Plus size={15} />
            Create Custom
          </Button>
        </Tooltip>
      </div>

      <div className="rounded-2xl border border-[#7C3AED]/25 bg-[#7C3AED]/[0.07] backdrop-blur-md p-5 shadow-sm">
        <form onSubmit={handleClone} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex-1">
            <div className="text-sm font-medium text-slate-800 mb-1">Clone a new creator style</div>
            <p className="text-xs text-slate-500">
              Paste a TikTok video URL and we&apos;ll extract the creator&apos;s writing style
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
            <div className="flex items-center gap-2 flex-1 sm:w-64 min-w-0">
              <Link2 size={14} className="text-slate-500 shrink-0" />
              <input
                placeholder="https://www.tiktok.com/@user/video/..."
                value={cloneUrl}
                onChange={(e) => setCloneUrl(e.target.value)}
                className="flex-1 min-w-0 h-9 px-3 rounded-xl border border-slate-200/60 bg-white/80 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#7C3AED]/40"
              />
            </div>
            <div className="relative" ref={langDropdownRef}>
              <button
                type="button"
                onClick={() => setLangOpen((o) => !o)}
                className="relative h-9 pl-3 pr-8 rounded-xl border border-slate-200/60 bg-white/80 text-sm text-slate-800 flex items-center min-w-[7rem] outline-none focus:border-[#7C3AED]/40 hover:border-slate-300/60 transition-colors"
              >
                <span>{LANG_OPTIONS.find((o) => o.value === cloneLang)?.label ?? 'Auto'}</span>
                <ChevronDown size={14} className={cn('text-slate-500 shrink-0 absolute right-2.5', langOpen && 'rotate-180')} />
              </button>
              {langOpen && (
                <div className="absolute top-full left-0 mt-1 w-full min-w-[10rem] rounded-xl border border-slate-200/60 bg-white/95 backdrop-blur-xl shadow-xl shadow-slate-300/30 py-1 z-50">
                  {LANG_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setCloneLang(opt.value);
                        setLangOpen(false);
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm transition-colors',
                        cloneLang === opt.value
                          ? 'bg-[#7C3AED]/15 text-[#7C3AED]'
                          : 'text-slate-700 hover:bg-slate-100/80'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Tooltip content="Clone style" description="Extract writing style from the TikTok video" side="top">
              <Button variant="accent" size="sm" type="submit" disabled={cloning || !cloneUrl.trim()}>
                {cloning ? <Loader2 size={14} className="animate-spin" /> : 'Clone'}
              </Button>
            </Tooltip>
          </div>
        </form>
        {cloneError && (
          <p className="mt-3 text-sm text-red-500">{cloneError}</p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-1 border border-slate-200/50 rounded-xl p-1 bg-white/60">
          {[
            { key: 'all' as const, label: `All (${characters.length})` },
            { key: 'cloned' as const, label: `Cloned (${clonedCount})` },
            { key: 'custom' as const, label: `Custom (${customCount})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-3 h-7 rounded-lg text-xs font-medium transition-all',
                tab === t.key
                  ? 'bg-[#7C3AED]/15 text-[#7C3AED]'
                  : 'text-slate-600 hover:text-slate-800'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search characters..."
            className="h-9 pl-9 pr-4 w-48 rounded-xl border border-slate-200/60 bg-white/80 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#7C3AED]/40 transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#7C3AED]" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((char) => (
            <CharacterCard
              key={char._id}
              id={char._id}
              name={char.name}
              platform={char.platform}
              sourceUrl={char.sourceUrl}
              description={char.description}
              accentColor={char.accentColor}
              isCustom={char.sourceType === 'custom'}
              onEdit={() => router.push(`/characters/${char._id}/edit`)}
              onDelete={async () => {
                const res = await fetch(`/api/characters/${char._id}`, { method: 'DELETE' });
                const json = await res.json();
                if (json.success) setCharacters((prev) => prev.filter((c) => c._id !== char._id));
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 rounded-2xl border border-slate-200/50 bg-white/60 backdrop-blur-md shadow-sm">
          <div className="text-4xl mb-3">🎭</div>
          <div className="text-base font-medium text-slate-800 mb-1">No characters found</div>
          <div className="text-sm text-slate-500">Clone a creator or create a custom character</div>
        </div>
      )}
    </div>
  );
}
