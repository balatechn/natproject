'use client';

import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadialBarChart, RadialBar,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  BarChart2, Users, CheckSquare, TrendingUp, ShieldCheck, AlertTriangle,
} from 'lucide-react';
import {
  useProjectStatusReport,
  useTaskSummaryReport,
  useTaskSlaReport,
  useTeamWorkloadReport,
  useResourceUtilizationReport,
} from '@/hooks/use-reports';

// ── Colour palette ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  PLANNING:    '#3b82f6',
  IN_PROGRESS: '#16a34a',
  ON_HOLD:     '#f59e0b',
  COMPLETED:   '#10b981',
  CANCELLED:   '#ef4444',
  TODO:        '#94a3b8',
  DONE:        '#10b981',
  IN_REVIEW:   '#a78bfa',
  BLOCKED:     '#ef4444',
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT:   '#ef4444',
  HIGH:     '#f97316',
  MEDIUM:   '#f59e0b',
  LOW:      '#3b82f6',
};

// ── Small helpers ──────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, label, value, sub, color = 'blue',
}: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  const colors: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    green:  'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    amber:  'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    red:    'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`rounded-xl p-3 ${colors[color] ?? colors.blue}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

const RADIAN = Math.PI / 180;
const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ── Tabs ──────────────────────────────────────────────────────────────────────

function OverviewTab() {
  const { data: taskSummary, isLoading: tLoading } = useTaskSummaryReport();
  const { data: sla, isLoading: sLoading } = useTaskSlaReport();
  const { data: projects, isLoading: pLoading } = useProjectStatusReport();

  const statusData = (taskSummary?.byStatus ?? []).map((s) => ({
    name: s.status.replace('_', ' '),
    value: s.count,
    fill: STATUS_COLORS[s.status] ?? '#94a3b8',
  }));

  const priorityData = (taskSummary?.byPriority ?? []).map((s) => ({
    name: s.priority,
    Tasks: s.count,
  }));

  const projectStatusSummary = (projects ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});
  const projectBarData = Object.entries(projectStatusSummary).map(([status, count]) => ({ status, count }));

  const isLoading = tLoading || sLoading || pLoading;

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : (
          <>
            <KpiCard icon={CheckSquare} label="Total Tasks"       value={taskSummary?.total ?? 0}          color="blue" />
            <KpiCard icon={TrendingUp}  label="Done"              value={taskSummary?.byStatus.find(s => s.status === 'DONE')?.count ?? 0} color="green" />
            <KpiCard icon={AlertTriangle} label="SLA Breaches"   value={sla?.breached ?? 0}               color="red" />
            <KpiCard icon={ShieldCheck}  label="SLA Compliance"  value={`${sla?.complianceRate ?? 100}%`} color="green" />
          </>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Task status donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Task Status Distribution</CardTitle>
            <CardDescription className="text-xs">All tasks by current status</CardDescription>
          </CardHeader>
          <CardContent>
            {tLoading ? <Skeleton className="h-52 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData} cx="50%" cy="50%"
                    innerRadius={55} outerRadius={90}
                    dataKey="value" labelLine={false} label={CustomLabel}
                  >
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [v, 'Tasks']} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Task priority bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Tasks by Priority</CardTitle>
            <CardDescription className="text-xs">Count of tasks per priority level</CardDescription>
          </CardHeader>
          <CardContent>
            {tLoading ? <Skeleton className="h-52 w-full" /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={priorityData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                  <Tooltip />
                  <Bar dataKey="Tasks" radius={[4, 4, 0, 0]}>
                    {priorityData.map((entry, i) => (
                      <Cell key={i} fill={PRIORITY_COLORS[entry.name] ?? '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Projects by status */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Projects by Status</CardTitle>
            <CardDescription className="text-xs">Count of active projects grouped by status</CardDescription>
          </CardHeader>
          <CardContent>
            {pLoading ? <Skeleton className="h-48 w-full" /> : projectBarData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No projects yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={projectBarData} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                  <Tooltip />
                  <Bar dataKey="count" name="Projects" radius={[4, 4, 0, 0]}>
                    {projectBarData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] ?? '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProjectsTab() {
  const { data: projects, isLoading } = useProjectStatusReport();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">All Projects</CardTitle>
        <CardDescription className="text-xs">Completion rates and task counts per project</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (projects ?? []).length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">No projects found</div>
        ) : (
          <div className="space-y-3">
            {(projects ?? []).map((p) => (
              <div key={p.id} className="rounded-xl border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-muted-foreground shrink-0">{p.code}</span>
                    <span className="font-medium text-sm truncate">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      style={{ borderColor: STATUS_COLORS[p.status], color: STATUS_COLORS[p.status] }}
                      className="text-[10px]"
                    >
                      {p.status.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs font-semibold">{p.completionRate}%</span>
                  </div>
                </div>
                <Progress value={p.completionRate} className="h-1.5" />
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{p.tasksDone}/{p.taskCount} tasks</span>
                  <span>{p.milestonesCompleted}/{p.milestonesTotal} milestones</span>
                  {p.budget && <span>Budget: ${p.budget.toLocaleString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TeamTab() {
  const { data: workload, isLoading } = useTeamWorkloadReport();
  const { data: resources, isLoading: rLoading } = useResourceUtilizationReport();

  const barData = (workload ?? [])
    .filter((u) => u.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 12)
    .map((u) => ({
      name: u.name.split(' ')[0],
      Done: u.completed,
      'In Progress': u.inProgress,
      Todo: u.todo,
    }));

  return (
    <div className="space-y-5">
      {/* Stacked bar: tasks per user */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Team Workload</CardTitle>
          <CardDescription className="text-xs">Task count per member (top 12 by total)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-56 w-full" /> : barData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No task assignments yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Done"        stackId="a" fill="#10b981" radius={[0,0,0,0]} />
                <Bar dataKey="In Progress" stackId="a" fill="#3b82f6" />
                <Bar dataKey="Todo"        stackId="a" fill="#94a3b8" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Resource utilization */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Resource Utilization (This Month)</CardTitle>
          <CardDescription className="text-xs">Allocated hours vs. available capacity</CardDescription>
        </CardHeader>
        <CardContent>
          {rLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (resources ?? []).length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">No resource allocations this month</div>
          ) : (
            <div className="space-y-3">
              {(resources ?? []).map((r) => (
                <div key={r.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{r.name}</span>
                    <span className="text-muted-foreground">
                      {r.allocatedHours}h / {r.maxHours}h
                      <span className={`ml-2 font-semibold ${r.utilizationPct >= 80 ? 'text-red-500' : r.utilizationPct >= 50 ? 'text-amber-500' : 'text-green-600'}`}>
                        {r.utilizationPct}%
                      </span>
                    </span>
                  </div>
                  <Progress
                    value={r.utilizationPct}
                    className={`h-2 ${r.utilizationPct >= 80 ? '[&>div]:bg-red-500' : r.utilizationPct >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'}`}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ReportsClient() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <BarChart2 className="h-6 w-6 text-primary shrink-0" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">Live insights across projects, tasks, and team</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-5"><OverviewTab /></TabsContent>
        <TabsContent value="projects" className="mt-5"><ProjectsTab /></TabsContent>
        <TabsContent value="team"     className="mt-5"><TeamTab /></TabsContent>
      </Tabs>
    </div>
  );
}
