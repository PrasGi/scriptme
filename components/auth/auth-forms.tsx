'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LogoStatic } from '@/components/common/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLogin } from '@/hooks/use-login';
import { useRegister } from '@/hooks/use-register';
import { validateRegister } from '@/app/api/auth/register/validation';

// ────────────────────────────────────────────────────────────────────────────
// LOGIN FORM
// ────────────────────────────────────────────────────────────────────────────
export function LoginForm() {
  const searchParams = useSearchParams();
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  const { login, loginWithGoogle, isLoading, error, fieldErrors, clearError } =
    useLogin();

  // Auth.js redirects to /login?error=CredentialsSignin on failure; show message even when client didn't get result
  const authError = searchParams.get('error');
  const displayError = error ?? (authError === 'CredentialsSignin' ? 'Invalid email or password' : authError ? 'Sign-in failed. Please try again.' : null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ email, password });
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="flex justify-center mb-2">
        <LogoStatic size="lg" />
      </div>

      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-white">Welcome back</h1>
        <p className="text-sm text-[#8B949E]">Sign in to continue creating amazing scripts</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/6 backdrop-blur-xl p-8 space-y-5">
        {/* OAuth */}
        <button
          type="button"
          onClick={() => loginWithGoogle()}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-white/10 bg-white/4 text-sm text-white hover:bg-white/8 transition-colors disabled:opacity-50"
        >
          <GoogleIcon /> Continue with Google
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/6" />
          <span className="text-xs text-[#8B949E]">or continue with email</span>
          <div className="flex-1 h-px bg-white/6" />
        </div>

        {/* Error banner (from hook or from URL ?error=CredentialsSignin) */}
        {displayError && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            <AlertCircle size={15} className="shrink-0" />
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            label="Email"
            placeholder="you@example.com"
            leftIcon={<Mail size={16} />}
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearError(); }}
            error={fieldErrors.email}
            required
            autoComplete="email"
          />
          <Input
            type={showPass ? 'text' : 'password'}
            label="Password"
            placeholder="••••••••"
            leftIcon={<Lock size={16} />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="hover:text-white transition-colors"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearError(); }}
            error={fieldErrors.password}
            required
            autoComplete="current-password"
          />
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs text-[#7C3AED] hover:underline">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
            Sign In
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-[#8B949E]">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-[#7C3AED] hover:underline font-medium">
          Sign up free
        </Link>
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// REGISTER FORM
// ────────────────────────────────────────────────────────────────────────────
export function RegisterForm() {
  const [showPass, setShowPass] = useState(false);
  const [step, setStep]         = useState<1 | 2>(1);
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  const { register, isLoading, error, fieldErrors, clearError, setFieldErrors } = useRegister();
  const { loginWithGoogle: oauthGoogle } = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      const result = validateRegister({ name, email, password });
      if (!result.ok) {
        const errs: Record<string, string> = {};
        Object.entries(result.errors).forEach(([k, msgs]) => {
          errs[k] = Array.isArray(msgs) ? msgs.join('. ') : String(msgs);
        });
        setFieldErrors(errs);
        return;
      }
      setStep(2);
      return;
    }
    register({ name, email, password });
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="flex justify-center mb-2">
        <LogoStatic size="lg" />
      </div>
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-white">Create your account</h1>
        <p className="text-sm text-[#8B949E]">Start generating better scripts today — it&apos;s free</p>
      </div>

      {/* Step progress */}
      <div className="flex gap-2">
        {([1, 2] as const).map((s) => (
          <div
            key={s}
            className={cn(
              'h-1 flex-1 rounded-full transition-all',
              s <= step ? 'bg-[#7C3AED]' : 'bg-white/6'
            )}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/6 backdrop-blur-xl p-8 space-y-5">
        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            <AlertCircle size={15} className="shrink-0" />
            {error}
          </div>
        )}

        {step === 1 && (
          <>
            <button
              type="button"
              onClick={() => oauthGoogle()}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-white/10 bg-white/4 text-sm text-white hover:bg-white/8 transition-colors"
            >
              <GoogleIcon /> Continue with Google
            </button>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/6" />
              <span className="text-xs text-[#8B949E]">or with email</span>
              <div className="flex-1 h-px bg-white/6" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 ? (
            <>
              <Input
                label="Full name"
                placeholder="John Doe"
                leftIcon={<User size={16} />}
                value={name}
                onChange={(e) => { setName(e.target.value); clearError(); }}
                error={fieldErrors.name}
                required
                autoComplete="name"
              />
              <Input
                type="email"
                label="Email"
                placeholder="you@example.com"
                leftIcon={<Mail size={16} />}
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError(); }}
                error={fieldErrors.email}
                required
                autoComplete="email"
              />
              <Input
                type={showPass ? 'text' : 'password'}
                label="Password"
                placeholder="Min. 8 chars, 1 uppercase, 1 number"
                leftIcon={<Lock size={16} />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="hover:text-white transition-colors"
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError(); }}
                error={fieldErrors.password}
                required
                autoComplete="new-password"
              />
            </>
          ) : (
            <>
              <div className="text-sm text-white font-medium mb-1">Tell us about your work</div>
              <label className="block text-xs text-[#8B949E] mb-2">I primarily create content for</label>
              <div className="grid grid-cols-2 gap-2">
                {['YouTube', 'TikTok', 'Instagram', 'Podcast', 'LinkedIn', 'Other'].map((p) => (
                  <label
                    key={p}
                    className="flex items-center gap-2 p-3 rounded-xl border border-white/6 bg-white/2 cursor-pointer hover:border-white/12 hover:bg-white/4 transition-all"
                  >
                    <input type="checkbox" className="accent-[#7C3AED]" />
                    <span className="text-sm text-[#8B949E]">{p}</span>
                  </label>
                ))}
              </div>
              <label className="block">
                <span className="text-xs text-[#8B949E] mb-1.5 block">Channel / Content Niche</span>
                <Input placeholder="e.g. Tech reviews, Fitness, Finance..." />
              </label>
            </>
          )}

          <div className="flex gap-3">
            {step === 2 && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => setStep(1)}
                disabled={isLoading}
              >
                Back
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="flex-1"
              isLoading={isLoading}
            >
              {step === 1 ? 'Continue →' : 'Create Account'}
            </Button>
          </div>
        </form>
      </div>

      <p className="text-center text-sm text-[#8B949E]">
        Already have an account?{' '}
        <Link href="/login" className="text-[#7C3AED] hover:underline font-medium">
          Sign in
        </Link>
      </p>
      <p className="text-center text-xs text-[#8B949E]/60">
        By creating an account you agree to our{' '}
        <Link href="/terms" className="underline">Terms</Link> and{' '}
        <Link href="/privacy" className="underline">Privacy Policy</Link>.
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// SVG Icons
// ────────────────────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M21.8 12.2c0-.7-.1-1.3-.2-2H12v3.8h5.5c-.2 1.3-1 2.4-2.1 3.1v2.6h3.4c2-1.8 3-4.5 3-7.5z" fill="#4285F4"/>
      <path d="M12 22c2.7 0 5-.9 6.7-2.4l-3.4-2.6c-.9.6-2 1-3.3 1-2.5 0-4.7-1.7-5.4-4H3v2.7C4.7 19.9 8.1 22 12 22z" fill="#34A853"/>
      <path d="M6.6 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.3H3C2.4 8.5 2 9.7 2 11s.4 2.5 1 3.7L6.6 14z" fill="#FBBC04"/>
      <path d="M12 5c1.4 0 2.7.5 3.7 1.4l2.7-2.7C16.9 2.1 14.6 1 12 1 8.1 1 4.7 3.1 3 6.3l3.6 2.7C7.3 6.7 9.5 5 12 5z" fill="#EA4335"/>
    </svg>
  );
}


