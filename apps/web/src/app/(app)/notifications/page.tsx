import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Notifications' };

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">Notification center — Phase 7</p>
      </div>
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Module coming soon in the next phase.
      </div>
    </div>
  );
}
