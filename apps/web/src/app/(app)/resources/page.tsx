import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Resources' };

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Resource Planner</h1>
        <p className="text-muted-foreground text-sm">Resource allocation and utilization — coming in Phase 3</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-16 text-center gap-3">
        <div className="text-4xl opacity-20">🚧</div>
        <p className="text-muted-foreground font-medium">Coming Soon</p>
        <p className="text-sm text-muted-foreground max-w-sm">This module is planned for an upcoming phase. Stay tuned!</p>
      </div>
    </div>
  );
}