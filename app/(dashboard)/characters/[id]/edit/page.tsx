'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, User } from 'lucide-react';

type Platform = 'youtube' | 'tiktok' | 'instagram' | 'custom';

const platformOptions: { value: Platform; label: string }[] = [
  { value: 'youtube',   label: 'YouTube' },
  { value: 'tiktok',    label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'custom',    label: 'Custom' },
];

const accentColors = [
  '#7C3AED', '#F59E0B', '#A855F7', '#10B981', '#EF4444', '#EC4899', '#3B82F6', '#84CC16',
];

interface Character {
  _id:         string;
  name:        string;
  description: string;
  platform:    Platform;
  accentColor: string;
  sourceType:  'cloned' | 'custom';
}

export default function EditCharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [platform,    setPlatform]    = useState<Platform>('custom');
  const [accentColor, setAccentColor] = useState('#7C3AED');

  useEffect(() => {
    fetch(`/api/characters/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          const c = json.data;
          setCharacter(c);
          setName(c.name ?? '');
          setDescription(c.description ?? '');
          setPlatform(c.platform ?? 'custom');
          setAccentColor(c.accentColor ?? '#7C3AED');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/characters/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:        name.trim(),
          description: description.trim(),
          platform,
          accentColor,
        }),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.message ?? 'Failed to update character');
      } else {
        router.push('/characters');
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin text-[#7C3AED]" />
      </div>
    );
  }

  if (!character) {
    return (
      <div className="text-center py-32">
        <p className="text-slate-500">Character not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push('/characters')}>
          Back to Characters
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/characters')}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <User size={22} className="text-[#7C3AED]" />
            Edit Character
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Update character details
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200/50 bg-white/70 backdrop-blur-md p-6 space-y-5 shadow-sm shadow-slate-200/20">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Name <span className="text-red-500">*</span>
          </label>
          <Input
            light
            placeholder="e.g. Tech Educator Style"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Style Description
          </label>
          <textarea
            placeholder="Tone, vocabulary, sentence structure — how this character writes"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-slate-200/60 bg-white/80 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#7C3AED]/50 transition-colors resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Platform
          </label>
          <div className="flex flex-wrap gap-2">
            {platformOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPlatform(opt.value)}
                className={`px-4 h-9 rounded-xl text-sm font-medium border transition-all ${
                  platform === opt.value
                    ? 'bg-[#7C3AED]/10 border-[#7C3AED]/40 text-[#7C3AED]'
                    : 'bg-slate-100/80 border-slate-200/50 text-slate-600 hover:text-slate-800 hover:border-slate-300/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Accent Color
          </label>
          <div className="flex flex-wrap gap-2">
            {accentColors.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => setAccentColor(hex)}
                className={`w-9 h-9 rounded-xl border-2 transition-all ${
                  accentColor === hex ? 'border-slate-800 ring-2 ring-slate-400 scale-110' : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <Button
            type="submit"
            variant="accent"
            disabled={saving || !name.trim()}
            className="gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push('/characters')} className="!text-slate-700 hover:!bg-slate-100/80 hover:!text-slate-900">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
