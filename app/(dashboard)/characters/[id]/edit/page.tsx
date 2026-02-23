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
  '#06B6D4', '#F59E0B', '#A855F7', '#10B981', '#EF4444', '#EC4899', '#3B82F6', '#84CC16',
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
  const [accentColor, setAccentColor] = useState('#06B6D4');

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
          setAccentColor(c.accentColor ?? '#06B6D4');
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
        <Loader2 size={24} className="animate-spin text-[#06B6D4]" />
      </div>
    );
  }

  if (!character) {
    return (
      <div className="text-center py-32">
        <p className="text-[#8B949E]">Character not found.</p>
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
          className="p-2 rounded-xl text-[#8B949E] hover:text-white hover:bg-white/[0.05] transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <User size={22} className="text-[#06B6D4]" />
            Edit Character
          </h1>
          <p className="text-sm text-[#8B949E] mt-0.5">
            Update character details
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-white/[0.06] bg-[#0D1117] p-6 space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#8B949E] uppercase tracking-wider">
            Name <span className="text-red-400">*</span>
          </label>
          <Input
            placeholder="e.g. Tech Educator Style"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="bg-[#161B22] border-white/[0.08]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#8B949E] uppercase tracking-wider">
            Style Description
          </label>
          <textarea
            placeholder="Tone, vocabulary, sentence structure — how this character writes"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-white/[0.08] bg-[#161B22] px-3 py-2.5 text-sm text-white placeholder:text-[#8B949E]/60 outline-none focus:border-[#06B6D4]/50 transition-colors resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#8B949E] uppercase tracking-wider">
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
                    ? 'bg-[#06B6D4]/10 border-[#06B6D4]/40 text-[#06B6D4]'
                    : 'bg-white/[0.03] border-white/[0.06] text-[#8B949E] hover:text-white hover:border-white/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#8B949E] uppercase tracking-wider">
            Accent Color
          </label>
          <div className="flex flex-wrap gap-2">
            {accentColors.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => setAccentColor(hex)}
                className={`w-9 h-9 rounded-xl border-2 transition-all ${
                  accentColor === hex ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <Button
            type="submit"
            variant="cyan"
            disabled={saving || !name.trim()}
            className="gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push('/characters')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
