import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Workflows' };

export default function WorkflowsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
        <p className="text-muted-foreground">Approval and automation workflows — Phase 6</p>
      </div>
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Module coming soon in the next phase.
      </div>
    </div>
  );
}
