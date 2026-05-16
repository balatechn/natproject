import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Reports' };

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Analytics dashboards and exports — Phase 8</p>
      </div>
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Module coming soon in the next phase.
      </div>
    </div>
  );
}
