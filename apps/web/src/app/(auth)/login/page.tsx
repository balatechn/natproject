import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sign In' };

export default function LoginPage() {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm">
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg">
          <span className="text-xl font-bold text-white">N</span>
        </div>
        <h1 className="text-2xl font-bold text-white">NAT Project</h1>
        <p className="text-sm text-white/60">Enterprise Management Platform</p>
      </div>
      <p className="text-center text-white/40 text-sm">
        Login form — implemented in Phase 3
      </p>
    </div>
  );
}
