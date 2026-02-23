import { RegisterForm } from '@/components/auth/auth-forms';

export const metadata = {
  title: 'Sign Up — ScriptMinder',
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-cyan-500/8 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[400px] h-[400px] rounded-full bg-purple-500/8 blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="relative z-10 w-full">
        <RegisterForm />
      </div>
    </div>
  );
}
