'use client';

import { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { addDays, addMonths, subMonths, format, startOfDay, parseISO } from 'date-fns';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, CalendarDays, FolderKanban, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useProjects } from '@/hooks/use-projects';
import { useTasks, useUpdateTaskDynamic } from '@/hooks/use-tasks';
import { GanttTask, ZoomLevel, getDefaultViewRange, PRIORITY_COLOR, STATUS_COLOR } from '@/components/gantt/gantt-utils';
import { useToast } from '@/hooks/use-toast';

// Dynamically import the heavy canvas-based Gantt chart to keep the initial JS bundle smaller
const GanttChart = dynamic(
  () => import('@/components/gantt/gantt-chart').then((m) => ({ default: m.GanttChart })),
  { loading: () => <Skeleton className="h-full w-full rounded-md" />, ssr: false },
);

function toGanttTask(t: any): GanttTask {
  return {
    id: t.id,
    title: t.title,
    startDate: t.startDate ? parseISO(t.startDate) : (t.createdAt ? parseISO(t.createdAt) : null),
    endDate: t.dueDate ? parseISO(t.dueDate) : null,
    progress: t.progress ?? (t.status === 'DONE' ? 100 : 0),
    priority: t.priority ?? 'MEDIUM',
    status: t.status ?? 'TODO',
    isMilestone: t.isMilestone ?? false,
    parentId: t.parentId ?? null,
    color: STATUS_COLOR[t.status] ?? undefined,
    dependencies: t.dependencies?.map((d: any) => d.dependsOnId ?? d) ?? [],
  };
}

const ZOOM_LABELS: Record<ZoomLevel, string> = { day: 'Day', week: 'Week', month: 'Month' };

export default function GanttPage() {
  const { toast } = useToast();
  const [projectId, setProjectId] = useState('');
  const [zoom, setZoom] = useState<ZoomLevel>('week');
  const [selectedTask, setSelectedTask] = useState<GanttTask | null>(null);

  const { data: projects, isLoading: projectsLoading } = useProjects({ limit: 100 } as any);
  const { data: tasksData, isLoading: tasksLoading } = useTasks({
    projectId: projectId || undefined,
    limit: 200,
  });
  const updateTask = useUpdateTaskDynamic();

  const allTasks: GanttTask[] = useMemo(() => {
    const raw: any[] = tasksData?.data ?? [];
    // Sort: milestones last, then by startDate
    return raw
      .map(toGanttTask)
      .sort((a, b) => {
        if (!a.startDate) return 1;
        if (!b.startDate) return -1;
        return a.startDate.getTime() - b.startDate.getTime();
      });
  }, [tasksData]);

  const { start: autoStart, end: autoEnd } = useMemo(
    () => getDefaultViewRange(allTasks),
    [allTasks]
  );

  const [viewStart, setViewStart] = useState<Date | null>(null);
  const [viewEnd, setViewEnd] = useState<Date | null>(null);

  const effectiveStart = viewStart ?? autoStart;
  const effectiveEnd = viewEnd ?? autoEnd;

  const navigate = useCallback((dir: 'prev' | 'next') => {
    const delta = dir === 'next' ? 1 : -1;
    setViewStart((s) => {
      const base = s ?? autoStart;
      return zoom === 'month' ? addMonths(base, delta * 2) : addDays(base, delta * (zoom === 'week' ? 14 : 7));
    });
    setViewEnd((e) => {
      const base = e ?? autoEnd;
      return zoom === 'month' ? addMonths(base, delta * 2) : addDays(base, delta * (zoom === 'week' ? 14 : 7));
    });
  }, [zoom, autoStart, autoEnd]);

  const handleReschedule = useCallback(async (taskId: string, newStart: Date, newEnd: Date) => {
    try {
      await updateTask.mutateAsync({
        id: taskId,
        data: {
          startDate: newStart.toISOString(),
          dueDate: newEnd.toISOString(),
        },
      });
      toast({ title: 'Task rescheduled' });
    } catch {
      toast({ title: 'Failed to reschedule', variant: 'destructive' });
    }
  }, [updateTask, toast]);

  const isLoading = projectsLoading || tasksLoading;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gantt Chart</h1>
          <p className="text-sm text-muted-foreground">
            {allTasks.length} tasks{projectId ? '' : ' across all projects'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Project selector */}
          <Select value={projectId} onValueChange={(v) => { setProjectId(v); setViewStart(null); setViewEnd(null); }}>
            <SelectTrigger className="w-52">
              <FolderKanban className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All projects</SelectItem>
              {(projects?.data ?? []).map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Zoom */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            {(['day', 'week', 'month'] as ZoomLevel[]).map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  zoom === z
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground'
                }`}
              >
                {ZOOM_LABELS[z]}
              </button>
            ))}
          </div>

          {/* Navigate */}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => navigate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setViewStart(null); setViewEnd(null); }}
              className="text-xs"
            >
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Date range indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5" />
        <span>
          {format(effectiveStart, 'MMM d, yyyy')} — {format(effectiveEnd, 'MMM d, yyyy')}
        </span>
        <div className="flex items-center gap-3 ml-4">
          {Object.entries(STATUS_COLOR).map(([s, c]) => (
            <span key={s} className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c }} />
              {s.replace('_', ' ')}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="text-amber-500">◆</span> Milestone
          </span>
        </div>
      </div>

      {/* Chart */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : allTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground border rounded-xl bg-card">
          <CalendarDays className="h-12 w-12 opacity-30" />
          <p className="font-medium">No tasks with dates found</p>
          <p className="text-sm">Assign start/due dates to tasks to see them here</p>
        </div>
      ) : (
        <GanttChart
          tasks={allTasks}
          zoom={zoom}
          viewStart={effectiveStart}
          viewEnd={effectiveEnd}
          onTaskClick={setSelectedTask}
          onTaskReschedule={handleReschedule}
          className="flex-1 min-h-[400px]"
        />
      )}

      {/* Task detail sheet */}
      {selectedTask && (
        <Sheet open onOpenChange={(v) => !v && setSelectedTask(null)}>
          <SheetContent className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle className="text-left">{selectedTask.title}</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="info" className="text-[10px] mt-0.5">{selectedTask.status.replace('_', ' ')}</Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <Badge variant="outline" className="text-[10px] mt-0.5" style={{ borderColor: PRIORITY_COLOR[selectedTask.priority] }}>
                    {selectedTask.priority}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="font-medium">{selectedTask.startDate ? format(selectedTask.startDate, 'PPP') : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Due Date</p>
                  <p className="font-medium">{selectedTask.endDate ? format(selectedTask.endDate, 'PPP') : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Progress</p>
                  <p className="font-medium">{selectedTask.progress}%</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 bg-muted rounded-lg p-3">
                <Info className="h-3.5 w-3.5 shrink-0" />
                Drag task bars to reschedule. Changes are saved automatically.
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
