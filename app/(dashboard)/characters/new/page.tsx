'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Loader2, User } from 'lucide-react';

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

export default function NewCharacterPage() {
  const router = useRouter();

  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [platform,    setPlatform]    = useState<Platform>('custom');
  const [accentColor, setAccentColor] = useState('#7C3AED');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/characters', {
        method:  'POST',
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
        setError(json.message ?? 'Failed to create character');
      } else {
        router.push('/characters');
      }
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl text-[#8B949E] hover:text-white hover:bg-white/[0.05] transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <User size={22} className="text-[#7C3AED]" />
            New Custom Character
          </h1>
          <p className="text-sm text-[#8B949E] mt-0.5">
            Define a custom writing style for AI scripts
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
            className="w-full rounded-xl border border-white/[0.08] bg-[#161B22] px-3 py-2.5 text-sm text-white placeholder:text-[#8B949E]/60 outline-none focus:border-[#7C3AED]/50 transition-colors resize-none"
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
                    ? 'bg-[#7C3AED]/10 border-[#7C3AED]/40 text-[#7C3AED]'
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
            variant="accent"
            disabled={loading || !name.trim()}
            className="gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {loading ? 'Creating…' : 'Create Character'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
