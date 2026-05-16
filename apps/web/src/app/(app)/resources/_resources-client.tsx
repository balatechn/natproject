'use client';

import { useState, useMemo } from 'react';
import {
  addDays, addMonths, subDays, subMonths, startOfDay, endOfDay, format, parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Users, BarChart3, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatCard } from '@/components/ui/stat-card';
import { ResourceTimeline, ResourceRow } from '@/components/resources/resource-timeline';
import { useResourceWorkload, useResourceAllocations } from '@/hooks/use-resources';
import { useProjects } from '@/hooks/use-projects';

const AVATAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#f97316', '#6366f1', '#14b8a6', '#84cc16',
];

function colorForIndex(i: number) {
  return AVATAR_COLORS[i % AVATAR_COLORS.length];
}

export default function ResourcesPage() {
  const today = startOfDay(new Date());
  const [rangeStart, setRangeStart] = useState(addDays(today, -3));
  const [rangeEnd, setRangeEnd] = useState(addDays(today, 18));
  const [projectId, setProjectId] = useState('');

  const { data: projects } = useProjects({ limit: 100 } as any);
  const { data: workload, isLoading: workloadLoading } = useResourceWorkload({
    startDate: rangeStart.toISOString(),
    endDate: rangeEnd.toISOString(),
    projectId: projectId || undefined,
  });
  const { data: allocations, isLoading: allocLoading } = useResourceAllocations({
    projectId: projectId || undefined,
    startDate: rangeStart.toISOString(),
    endDate: rangeEnd.toISOString(),
    limit: 200,
  } as any);

  const navigate = (dir: 'prev' | 'next') => {
    const d = dir === 'next' ? 14 : -14;
    setRangeStart((s) => addDays(s, d));
    setRangeEnd((e) => addDays(e, d));
  };

  // Build ResourceRow[] from workload API response
  // workload is expected to be: { members: [{ userId, name, role, dailyHours: { 'YYYY-MM-DD': hours } }] }
  // or an array of same
  const resourceRows: ResourceRow[] = useMemo(() => {
    const members: any[] = workload?.members ?? workload ?? [];
    return members.map((m: any, i: number) => ({
      id: m.userId ?? m.id ?? String(i),
      name: m.name ?? m.user?.name ?? 'Unknown',
      avatarInitial: (m.name ?? m.user?.name ?? '?')[0].toUpperCase(),
      role: m.role ?? m.user?.role ?? undefined,
      color: colorForIndex(i),
      dailyHours: m.dailyHours ?? {},
      capacity: m.dailyCapacity ?? 8,
    }));
  }, [workload]);

  // Summary stats
  const totalAllocated = useMemo(() => {
    return resourceRows.reduce((sum, r) => {
      return sum + Object.values(r.dailyHours).reduce((s, h) => s + h, 0);
    }, 0);
  }, [resourceRows]);

  const overloadedCount = useMemo(() => {
    return resourceRows.filter((r) => {
      const cap = r.capacity ?? 8;
      return Object.values(r.dailyHours).some((h) => h > cap);
    }).length;
  }, [resourceRows]);

  const allocationList: any[] = allocations?.data ?? allocations ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resource Planner</h1>
          <p className="text-sm text-muted-foreground">{resourceRows.length} team members</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All projects</SelectItem>
              {(projects?.data ?? []).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => navigate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => { setRangeStart(addDays(today, -3)); setRangeEnd(addDays(today, 18)); }}
            >
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Date range */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        <span>{format(rangeStart, 'MMM d, yyyy')} — {format(rangeEnd, 'MMM d, yyyy')}</span>
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          title="Team Members"
          value={resourceRows.length}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Total Allocated Hours"
          value={`${totalAllocated}h`}
          subtitle="in selected period"
          icon={BarChart3}
          color="green"
        />
        <StatCard
          title="Overloaded Members"
          value={overloadedCount}
          subtitle="exceed daily capacity"
          icon={Users}
          color={overloadedCount > 0 ? 'red' : 'default'}
        />
      </div>

      {/* Tabs: Timeline + Allocations */}
      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Availability Timeline</TabsTrigger>
          <TabsTrigger value="allocations">Allocations ({allocationList.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          {workloadLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <ResourceTimeline
              rows={resourceRows}
              viewStart={rangeStart}
              viewEnd={rangeEnd}
            />
          )}
        </TabsContent>

        <TabsContent value="allocations" className="mt-4">
          {allocLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : allocationList.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No allocations found</div>
          ) : (
            <div className="space-y-2">
              {allocationList.map((a: any, i: number) => (
                <div key={a.id ?? i} className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: colorForIndex(i) }}
                  >
                    {(a.user?.name ?? 'U')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{a.user?.name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{a.project?.name ?? a.projectId ?? '—'}</p>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0 text-right">
                    <p className="font-semibold text-foreground">{a.allocatedHours ?? 0}h</p>
                    {a.startDate && a.endDate && (
                      <p>{format(parseISO(a.startDate), 'MMM d')} — {format(parseISO(a.endDate), 'MMM d')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
