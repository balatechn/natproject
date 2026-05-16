import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sign In' };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-green-950 via-brand-blue-950 to-brand-green-900 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
