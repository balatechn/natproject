import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Tasks' };

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground">Kanban, list, and calendar views — Phase 4</p>
      </div>
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Module coming soon in the next phase.
      </div>
    </div>
  );
}
