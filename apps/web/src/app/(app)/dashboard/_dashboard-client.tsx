'use client';

import { FolderKanban, CheckSquare, AlertTriangle, TrendingUp, BarChart3 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useDashboardStats, useDashboardProjectReport } from '@/hooks/use-dashboard';
import { useAuthStore } from '@/store/index';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  PLANNING: '#6366f1',
  IN_PROGRESS: '#3b82f6',
  ON_HOLD: '#f59e0b',
  COMPLETED: '#16a34a',
  CANCELLED: '#ef4444',
  ARCHIVED: '#94a3b8',
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: projectReport, isLoading: reportLoading } = useDashboardProjectReport();

  const projectByStatus = stats?.projects?.byStatus ?? [];
  const taskByStatus = stats?.tasks?.byStatus ?? [];

  const activeProjectsCount = projectByStatus.find((p: any) => p.status === 'IN_PROGRESS')?._count ?? 0;

  const taskChartData = taskByStatus.map((t: any) => ({
    name: t.status.replace('_', ' '),
    count: t._count,
  }));

  const projectPieData = projectByStatus.map((p: any) => ({
    name: p.status,
    value: p._count,
  }));

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting()}, {user?.name?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">Here's what's happening in your workspace today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <StatCard
              title="Total Projects"
              value={stats?.projects?.total ?? 0}
              subtitle={`${stats?.projects?.overdue ?? 0} overdue`}
              icon={FolderKanban}
              color="blue"
            />
            <StatCard
              title="Open Tasks"
              value={(stats?.tasks?.total ?? 0) - (taskByStatus.find((t: any) => t.status === 'DONE')?._count ?? 0)}
              subtitle={`${stats?.tasks?.overdue ?? 0} overdue`}
              icon={CheckSquare}
              color="green"
            />
            <StatCard
              title="SLA Breaches"
              value={stats?.tasks?.slaBreach ?? 0}
              subtitle="Needs immediate attention"
              icon={AlertTriangle}
              color={stats?.tasks?.slaBreach > 0 ? 'red' : 'default'}
            />
            <StatCard
              title="Active Projects"
              value={activeProjectsCount}
              subtitle="Currently in progress"
              icon={TrendingUp}
              color="amber"
            />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Task status bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={taskChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Project status pie chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Projects by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={projectPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" label>
                    {projectPieData.map((entry: any, i: number) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Project health table */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Project Health</CardTitle>
          <Link href="/projects" className="text-xs text-primary hover:underline">View all →</Link>
        </CardHeader>
        <CardContent>
          {reportLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {(projectReport ?? []).slice(0, 6).map((p: any) => (
                <div key={p.id} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium truncate">{p.name}</span>
                      <Badge variant={p.status === 'COMPLETED' ? 'success' : p.status === 'ON_HOLD' ? 'warning' : 'info'} className="text-[10px] py-0">
                        {p.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={p.completionRate} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground tabular-nums w-8">{p.completionRate}%</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right shrink-0">
                    <div>{p.tasksDone}/{p.taskCount} tasks</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
