import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Budi Santoso',
    role: 'Tech YouTuber • 380K subs',
    avatar: 'BS',
    content:
      'ScriptMe cut my script writing time by 70%. The analysis feature alone is worth it — it showed me my intros were too slow before I even filmed.',
    rating: 5,
    accent: '#7C3AED',
  },
  {
    name: 'Sari Dewi',
    role: 'TikTok Creator • 1.2M followers',
    avatar: 'SD',
    content:
      'The clone feature is insane. I analyzed 3 top creators in my niche and now my scripts feel natural yet uniquely mine. Views tripled in a month.',
    rating: 5,
    accent: '#A855F7',
  },
  {
    name: 'Marcus Chen',
    role: 'Marketing Agency Owner',
    avatar: 'MC',
    content:
      'We use ScriptMe for all client video campaigns. The ability to maintain different character styles per client is a game-changer for our workflow.',
    rating: 5,
    accent: '#10B981',
  },
  {
    name: 'Rina Kartika',
    role: 'Educational Content Creator',
    avatar: 'RK',
    content:
      'My audience retention improved from 45% to 68% after using the script analysis. The pacing suggestions are incredibly accurate.',
    rating: 5,
    accent: '#F59E0B',
  },
  {
    name: 'Danny Wijaya',
    role: 'Shorts Creator • 5M views/month',
    avatar: 'DW',
    content:
      'I generate 10 short scripts every morning in under 15 minutes. ScriptMe understands the short-form format perfectly.',
    rating: 5,
    accent: '#7C3AED',
  },
  {
    name: 'Alicia Torres',
    role: 'Podcast Producer',
    avatar: 'AT',
    content:
      'Even for podcast episode outlines, this tool is brilliant. The structure suggestions keep our episodes focused and engaging throughout.',
    rating: 5,
    accent: '#EF4444',
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0B0E14]">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <Badge variant="green" className="mx-auto">Testimonials</Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
            Loved by <span className="gradient-text">12,000+ creators</span>
          </h2>
          <p className="text-[#8B949E] max-w-xl mx-auto">
            From solo YouTubers to agency teams — see what they&apos;re saying.
          </p>
        </div>

        {/* Grid */}
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {testimonials.map((t) => (
            <Card key={t.name} hover className="break-inside-avoid mb-4">
              {/* Stars */}
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} size={12} className="text-[#F59E0B] fill-[#F59E0B]" />
                ))}
              </div>
              <p className="text-sm text-[#8B949E] leading-relaxed mb-5">&ldquo;{t.content}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: `${t.accent}30`, color: t.accent }}
                >
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{t.name}</div>
                  <div className="text-xs text-[#8B949E]">{t.role}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
