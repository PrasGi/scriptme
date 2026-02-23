import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const steps = [
  {
    step: '01',
    title: 'Create a Project',
    description:
      'Start a new project and tell us about your channel, niche, and target audience. Our AI personalizes everything to your content style.',
    accent: '#06B6D4',
  },
  {
    step: '02',
    title: 'Generate or Import Script',
    description:
      'Either generate a fresh script with our AI or paste your existing draft. Works with any video format: tutorials, vlogs, reviews, shorts.',
    accent: '#A855F7',
  },
  {
    step: '03',
    title: 'Analyze & Optimize',
    description:
      'Get an engagement score, hook strength rating, and AI recommendations. See exactly where your audience will drop off before they do.',
    accent: '#10B981',
  },
  {
    step: '04',
    title: 'Clone & Customize Style',
    description:
      'Drop a TikTok creator URL to capture their writing DNA. Apply that style or any saved character to transform your script in one click.',
    accent: '#F59E0B',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0D1117]">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <Badge variant="purple" className="mx-auto">How It Works</Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
            From idea to
            <span className="gradient-text"> perfect script</span>
            <br />
            in 4 simple steps
          </h2>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line */}
          <div className="hidden md:block absolute left-[calc(50%-1px)] top-10 bottom-10 w-px bg-gradient-to-b from-[#06B6D4]/40 via-[#A855F7]/40 to-transparent" />

          <div className="space-y-8">
            {steps.map((step, i) => (
              <div
                key={step.step}
                className={cn(
                  'relative flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-12',
                  i % 2 === 1 && 'md:flex-row-reverse'
                )}
              >
                {/* Content */}
                <div className="flex-1 md:text-right order-2 md:order-none" style={i % 2 === 1 ? { textAlign: 'left' } : {}}>
                  <div className="inline-block rounded-2xl border border-white/[0.06] bg-[#161B22] p-6 hover:border-white/[0.12] transition-all">
                    <div className="text-xs font-mono text-[#8B949E] mb-2" style={{ color: step.accent }}>
                      Step {step.step}
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-[#8B949E] leading-relaxed max-w-sm">{step.description}</p>
                  </div>
                </div>

                {/* Center dot */}
                <div
                  className="relative z-10 flex-shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center font-bold text-sm order-1 md:order-none"
                  style={{
                    borderColor: step.accent,
                    color: step.accent,
                    background: `${step.accent}15`,
                  }}
                >
                  {step.step}
                </div>

                {/* Empty spacer for alternating layout */}
                <div className="flex-1 hidden md:block" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
