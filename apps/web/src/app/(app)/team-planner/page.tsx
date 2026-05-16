import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Team Planner' };

export default function TeamPlannerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team Planner</h1>
        <p className="text-muted-foreground">Capacity planning and scheduling — Phase 5</p>
      </div>
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Module coming soon in the next phase.
      </div>
    </div>
  );
}
