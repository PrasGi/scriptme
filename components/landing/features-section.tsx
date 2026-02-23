import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText, BarChart2, Link2, Wand2,
  Zap, Target, Shield, Sparkles
} from 'lucide-react';

const features = [
  {
    icon: FileText,
    title: 'Generate Video Script',
    description:
      'Describe your topic, audience, and tone — our AI generates a complete, structured video script with hooks, body, and CTA in seconds.',
    badge: 'Core',
    badgeVariant: 'cyan' as const,
    highlight: true,
    accent: '#06B6D4',
  },
  {
    icon: BarChart2,
    title: 'Analyze Your Script',
    description:
      'Upload or paste your script and get a detailed report: engagement score, hook effectiveness, emotional triggers, and pacing suggestions.',
    badge: 'Analytics',
    badgeVariant: 'green' as const,
    highlight: false,
    accent: '#10B981',
  },
  {
    icon: Link2,
    title: 'Clone Creator Style',
    description:
      'Paste a TikTok URL and we extract the creator\'s writing style, vocabulary, and narrative patterns.',
    badge: 'AI Clone',
    badgeVariant: 'purple' as const,
    highlight: false,
    accent: '#A855F7',
  },
  {
    icon: Wand2,
    title: 'Apply Any Character',
    description:
      'Mix cloned characters onto your scripts. Make Elon Musk present your tutorial, or have MrBeast narrate your story.',
    badge: 'Creative',
    badgeVariant: 'orange' as const,
    highlight: false,
    accent: '#F59E0B',
  },
];

const extras = [
  { icon: Zap, title: 'Instant Generation', desc: 'Scripts ready in under 10 seconds' },
  { icon: Target, title: 'Audience Targeting', desc: 'Tailored for your specific niche' },
  { icon: Shield, title: 'Safe & Private', desc: 'Your content stays yours' },
  { icon: Sparkles, title: 'Multi-language', desc: 'Create in 30+ languages' },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0B0E14]">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <Badge variant="cyan" className="mx-auto">Features</Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
            Everything you need to
            <br />
            <span className="gradient-text">master video scripts</span>
          </h2>
          <p className="text-lg text-[#8B949E] max-w-2xl mx-auto">
            Four powerful AI capabilities to take your video content from idea to perfection.
          </p>
        </div>

        {/* Main features grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.title}
                hover
                className="group relative overflow-hidden"
                style={
                  feature.highlight
                    ? { borderColor: `${feature.accent}30`, background: `${feature.accent}06` }
                    : {}
                }
              >
                {/* Glow effect on highlight */}
                {feature.highlight && (
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 0% 0%, ${feature.accent}15, transparent 60%)`,
                    }}
                  />
                )}
                <div className="relative z-10 flex items-start gap-5">
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: `${feature.accent}15`, color: feature.accent }}
                  >
                    <Icon size={22} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-white">{feature.title}</h3>
                      <Badge variant={feature.badgeVariant}>{feature.badge}</Badge>
                    </div>
                    <p className="text-sm text-[#8B949E] leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Extra pills */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          {extras.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex items-center gap-3 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] hover:bg-white/[0.04] transition-all"
            >
              <Icon size={18} className="text-[#06B6D4] flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-white">{title}</div>
                <div className="text-xs text-[#8B949E]">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
