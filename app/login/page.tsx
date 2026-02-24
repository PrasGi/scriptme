import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/auth-forms';
import Link from 'next/link';
import { Logo } from '@/components/common/logo';
import { ChevronLeft, Sparkles, PenLine, Copy } from 'lucide-react';

export const metadata = {
  title: 'Sign In — ScriptMe',
};

function LoginFormFallback() {
  return (
    <div className="w-full max-w-md mx-auto animate-pulse rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-8 h-96" />
  );
}

export default function LoginPage() {
  return (
    <div className="dark relative min-h-screen bg-black text-white overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#7C3AED]/20 blur-[120px] animate-blob" />
        <div className="absolute top-[40%] right-[-5%] w-[400px] h-[400px] rounded-full bg-[#2563EB]/15 blur-[100px] animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-10%] left-[30%] w-[350px] h-[350px] rounded-full bg-[#6366F1]/10 blur-[80px] animate-blob animation-delay-4000" />
      </div>

      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10 grid lg:grid-cols-2 min-h-screen">
        <div className="hidden lg:flex flex-col justify-center px-12 xl:px-20">
          <div className="mb-10">
            <Logo href="/" size="md" />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 mt-2 text-sm text-[#8B949E] hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to home
            </Link>
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-6">
            <span className="text-white">Write, Analyze &</span>
            <br />
            <span className="gradient-text">Polish Your Script</span>
            <br />
            <span className="text-[#8B949E] text-3xl xl:text-4xl">with AI</span>
          </h1>

          <p className="text-lg text-[#8B949E] max-w-md leading-relaxed mb-10">
            Generate scripts, clone any creator&apos;s style, and get AI feedback to boost engagement.
            <span className="text-white font-medium"> All in one workspace.</span>
          </p>

          <div className="flex flex-wrap gap-3">
            {[
              { icon: Sparkles, label: 'AI Analysis' },
              { icon: PenLine, label: 'Generate & Edit' },
              { icon: Copy, label: 'Clone Style' },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-[#8B949E]"
              >
                <Icon className="h-4 w-4 text-[#A78BFA]" />
                {label}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-12 xl:px-16 py-12">
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex flex-col items-center gap-1">
              <Logo href="/" size="md" />
              <Link href="/" className="inline-flex items-center gap-1 text-sm text-[#8B949E] hover:text-white transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" />
                Back to home
              </Link>
            </div>
            <p className="text-[#8B949E] text-sm mt-2">AI-powered script writer for creators</p>
          </div>

          <div className="w-full max-w-md mx-auto">
            <Suspense fallback={<LoginFormFallback />}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
