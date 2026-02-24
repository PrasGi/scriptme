import { RegisterForm } from '@/components/auth/auth-forms';

export const metadata = {
  title: 'Sign Up — ScriptMe',
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 relative overflow-hidden">
      <div className="fixed inset-0 overflow-hidden -z-20 pointer-events-none">
        <div className="absolute rounded-full top-80 left-2/5 -translate-x-1/2 w-[520px] h-[520px] bg-[#7C3AED] blur-[100px]" />
        <div className="absolute rounded-full top-80 right-0 -translate-x-1/2 w-[520px] h-[520px] bg-[#2563EB] blur-[100px]" />
        <div className="absolute rounded-full top-0 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-[#6D28D9] blur-[100px]" />
      </div>
      <div className="relative z-10 w-full">
        <RegisterForm />
      </div>
    </div>
  );
}
