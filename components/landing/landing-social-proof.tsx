'use client';

export function LandingSocialProof() {
  const stats = [
    { number: '50K+', label: 'Scripts Created' },
    { number: '12K+', label: 'Active Creators' },
    { number: '98%', label: 'Satisfaction Rate' },
    { number: '~2 min', label: 'Avg. to first script' },
  ];

  const platforms = ['YouTube', 'TikTok', 'Instagram', 'Podcast', 'LinkedIn'];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-black">
      <div className="container mx-auto max-w-7xl">
        <div className="rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] p-8 lg:p-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6 mb-10">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="text-center p-5 rounded-xl bg-white/[0.04] border border-white/[0.06]"
              >
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1">
                  {stat.number}
                </div>
                <div className="text-[#8B949E] text-sm font-medium">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="text-center pt-4 border-t border-white/[0.06]">
            <p className="text-[#8B949E] mb-5 text-sm font-medium">
              Works with your workflow
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {platforms.map((name) => (
                <span
                  key={name}
                  className="px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm font-medium text-white/90"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
