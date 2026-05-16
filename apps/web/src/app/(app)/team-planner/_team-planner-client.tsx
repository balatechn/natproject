'use client';

import { useState, useMemo } from 'react';
import {
  startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval,
  format, isSameDay, startOfDay, parseISO, isToday,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Users, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useResourceWorkload } from '@/hooks/use-resources';
import { useTasks } from '@/hooks/use-tasks';
import { useProjects } from '@/hooks/use-projects';

const AVATAR_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#06b6d4', '#f97316', '#6366f1', '#14b8a6', '#84cc16',
];

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: 'border-l-red-500 bg-red-50 dark:bg-red-950/30',
  HIGH: 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/30',
  MEDIUM: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/30',
  LOW: 'border-l-slate-400 bg-muted/50',
  NONE: 'border-l-slate-300 bg-muted/30',
};

export default function TeamPlannerPage() {
  const today = startOfDay(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(today, { weekStartsOn: 1 }));
  const [projectId, setProjectId] = useState('');

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const { data: projects } = useProjects({ limit: 100 } as any);
  const { data: workload, isLoading: workloadLoading } = useResourceWorkload({
    startDate: weekStart.toISOString(),
    endDate: weekEnd.toISOString(),
    projectId: projectId || undefined,
  });
  const { data: tasksData, isLoading: tasksLoading } = useTasks({
    projectId: projectId || undefined,
    limit: 500,
  });

  const members: any[] = useMemo(() => workload?.members ?? workload ?? [], [workload]);
  const tasks: any[] = useMemo(() => tasksData?.data ?? [], [tasksData]);

  // Group tasks by assigneeId and dueDate
  const tasksByMemberDay = useMemo(() => {
    const map: Record<string, Record<string, any[]>> = {};
    for (const task of tasks) {
      if (!task.dueDate && !task.startDate) continue;
      const dateKey = format(parseISO(task.dueDate ?? task.startDate), 'yyyy-MM-dd');
      for (const assignee of (task.assignees ?? [])) {
        const uid = assignee.userId ?? assignee.user?.id;
        if (!uid) continue;
        if (!map[uid]) map[uid] = {};
        if (!map[uid][dateKey]) map[uid][dateKey] = [];
        map[uid][dateKey].push(task);
      }
    }
    return map;
  }, [tasks]);

  const isLoading = workloadLoading || tasksLoading;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Planner</h1>
          <p className="text-sm text-muted-foreground">
            Week of {format(weekStart, 'MMM d')} — {format(weekEnd, 'MMM d, yyyy')}
          </p>
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
            <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => subWeeks(w, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setWeekStart(startOfWeek(today, { weekStartsOn: 1 }))}
            >
              This Week
            </Button>
            <Button variant="outline" size="icon" onClick={() => setWeekStart((w) => addWeeks(w, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border overflow-hidden bg-card">
        {/* Day header row */}
        <div className="grid border-b" style={{ gridTemplateColumns: '200px repeat(7, 1fr)' }}>
          <div className="border-r px-3 py-3 bg-muted/40">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Member
            </span>
          </div>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                'border-r last:border-r-0 px-2 py-3 text-center bg-muted/40',
                isToday(day) ? 'bg-primary/10' : ''
              )}
            >
              <p className={cn('text-xs font-medium', isToday(day) ? 'text-primary' : 'text-muted-foreground')}>
                {format(day, 'EEE')}
              </p>
              <p className={cn(
                'text-sm font-bold mt-0.5',
                isToday(day)
                  ? 'h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto text-xs'
                  : day.getDay() === 0 || day.getDay() === 6 ? 'text-muted-foreground/50' : ''
              )}>
                {format(day, 'd')}
              </p>
            </div>
          ))}
        </div>

        {/* Member rows */}
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid" style={{ gridTemplateColumns: '200px repeat(7, 1fr)' }}>
                <div className="border-r p-3"><Skeleton className="h-8 w-full" /></div>
                {Array.from({ length: 7 }).map((_, j) => (
                  <div key={j} className="border-r last:border-r-0 p-2">
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
            <Calendar className="h-12 w-12 opacity-30" />
            <p className="font-medium">No team members found</p>
            <p className="text-sm">Allocate team members to projects to see their schedule here</p>
          </div>
        ) : (
          <div className="divide-y">
            {members.map((member: any, idx: number) => {
              const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
              const memberId = member.userId ?? member.id;
              const memberTasks = tasksByMemberDay[memberId] ?? {};
              const totalThisWeek = Object.values(memberTasks).flat().length;

              return (
                <div
                  key={memberId}
                  className={cn('grid', idx % 2 === 0 ? 'bg-background' : 'bg-muted/10')}
                  style={{ gridTemplateColumns: '200px repeat(7, 1fr)' }}
                >
                  {/* Member label */}
                  <div className="border-r p-3 flex items-center gap-2.5">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {(member.name ?? member.user?.name ?? '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{member.name ?? member.user?.name}</p>
                      <p className="text-[10px] text-muted-foreground">{totalThisWeek} tasks this week</p>
                    </div>
                  </div>

                  {/* Day cells */}
                  {days.map((day) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayTasks = memberTasks[dateKey] ?? [];
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                    return (
                      <div
                        key={dateKey}
                        className={cn(
                          'border-r last:border-r-0 p-1.5 min-h-[80px] align-top',
                          isWeekend ? 'bg-muted/20' : '',
                          isToday(day) ? 'bg-primary/5' : ''
                        )}
                      >
                        <div className="space-y-1">
                          {dayTasks.slice(0, 3).map((task: any) => (
                            <div
                              key={task.id}
                              className={cn(
                                'border-l-2 rounded-sm px-1.5 py-1 text-[10px] leading-tight cursor-default',
                                PRIORITY_COLOR[task.priority] ?? PRIORITY_COLOR.NONE
                              )}
                              title={task.title}
                            >
                              <p className="font-medium truncate">{task.title}</p>
                            </div>
                          ))}
                          {dayTasks.length > 3 && (
                            <div className="text-[10px] text-muted-foreground pl-1">
                              +{dayTasks.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="font-medium">Priority:</span>
        {[
          { label: 'Critical', cls: 'border-l-2 border-l-red-500 bg-red-50 dark:bg-red-950/30' },
          { label: 'High', cls: 'border-l-2 border-l-orange-500 bg-orange-50 dark:bg-orange-950/30' },
          { label: 'Medium', cls: 'border-l-2 border-l-blue-500 bg-blue-50 dark:bg-blue-950/30' },
          { label: 'Low', cls: 'border-l-2 border-l-slate-400 bg-muted/50' },
        ].map((l) => (
          <span key={l.label} className={cn('px-1.5 py-0.5 rounded-sm', l.cls)}>{l.label}</span>
        ))}
      </div>
    </div>
  );
}
