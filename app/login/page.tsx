import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/auth-forms';

export const metadata = {
  title: 'Sign In — ScriptMinder',
};

function LoginFormFallback() {
  return (
    <div className="w-full max-w-md mx-auto animate-pulse rounded-2xl border border-white/[0.08] bg-[#161B22] p-8 h-96" />
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-cyan-500/8 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-indigo-500/8 blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="relative z-10 w-full">
        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
