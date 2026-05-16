import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to NAT Project — Enterprise Management Platform</p>
      </div>

      {/* KPI Cards placeholder */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['Active Projects', 'Open Tasks', 'Team Members', 'Pending Approvals'].map((label) => (
          <div key={label} className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <div className="mt-2 h-7 w-16 rounded skeleton" />
          </div>
        ))}
      </div>

      {/* Charts placeholder */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <h3 className="mb-4 font-semibold">Project Status Overview</h3>
          <div className="h-48 w-full rounded skeleton" />
        </div>
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <h3 className="mb-4 font-semibold">Team Utilization</h3>
          <div className="h-48 w-full rounded skeleton" />
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Full dashboard implemented in Phase 4
      </p>
    </div>
  );
}
