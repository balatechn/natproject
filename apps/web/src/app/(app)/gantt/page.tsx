import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Gantt Chart' };

export default function GanttChartPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gantt Chart</h1>
        <p className="text-muted-foreground">Drag & drop Gantt with dependencies — Phase 5</p>
      </div>
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Module coming soon in the next phase.
      </div>
    </div>
  );
}
