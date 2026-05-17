'use client';

import { useState, useMemo } from 'react';
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  isToday,
  parseISO,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Trash2,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  useTimeEntries,
  useTimeEntriesSummary,
  useCreateTimeEntry,
  useDeleteTimeEntry,
  type TimeEntry,
  type CreateTimeEntryInput,
} from '@/hooks/use-time-entries';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  color: string;
}

interface Task {
  id: string;
  title: string;
  projectId: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hoursLabel(h: number) {
  if (!h) return '-';
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  if (mins === 0) return `${whole}h`;
  if (whole === 0) return `${mins}m`;
  return `${whole}h ${mins}m`;
}

function weekRange(anchor: Date) {
  return {
    start: startOfWeek(anchor, { weekStartsOn: 1 }), // Monday
    end: endOfWeek(anchor, { weekStartsOn: 1 }),       // Sunday
  };
}

// ── Log Time Dialog ───────────────────────────────────────────────────────────

function LogTimeDialog({
  open,
  onOpenChange,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultDate: string;
}) {
  const createEntry = useCreateTimeEntry();

  const [form, setForm] = useState<CreateTimeEntryInput>({
    projectId: '',
    taskId: undefined,
    description: '',
    hours: 1,
    date: defaultDate,
    billable: true,
  });

  // Projects for this org
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects', 'simple'],
    queryFn: async () => {
      const res = await apiClient.get('/projects', {
        params: { pageSize: 100 },
      });
      return (res.data.data?.data ?? res.data.data ?? res.data) as Project[];
    },
  });

  // Tasks for selected project
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ['tasks', 'simple', form.projectId],
    queryFn: async () => {
      const res = await apiClient.get('/tasks', {
        params: { projectId: form.projectId, pageSize: 200 },
      });
      return (res.data.data?.data ?? res.data.data ?? res.data) as Task[];
    },
    enabled: !!form.projectId,
  });

  const handleSubmit = async () => {
    if (!form.projectId || form.hours <= 0) return;
    await createEntry.mutateAsync({
      ...form,
      taskId: form.taskId || undefined,
      description: form.description || undefined,
    });
    onOpenChange(false);
    setForm({
      projectId: '',
      taskId: undefined,
      description: '',
      hours: 1,
      date: defaultDate,
      billable: true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Time</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Date */}
          <div className="grid gap-1.5">
            <Label htmlFor="te-date">Date</Label>
            <Input
              id="te-date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>

          {/* Project */}
          <div className="grid gap-1.5">
            <Label>Project *</Label>
            <Select
              value={form.projectId}
              onValueChange={(v) => setForm((f) => ({ ...f, projectId: v, taskId: undefined }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project…" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ background: p.color }}
                      />
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Task (optional) */}
          {form.projectId && (
            <div className="grid gap-1.5">
              <Label>Task (optional)</Label>
              <Select
                value={form.taskId ?? '__none__'}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, taskId: v === '__none__' ? undefined : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No specific task" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No specific task</SelectItem>
                  {tasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Hours */}
          <div className="grid gap-1.5">
            <Label htmlFor="te-hours">Hours *</Label>
            <Input
              id="te-hours"
              type="number"
              min={0.01}
              max={24}
              step={0.25}
              value={form.hours}
              onChange={(e) =>
                setForm((f) => ({ ...f, hours: parseFloat(e.target.value) || 0 }))
              }
            />
          </div>

          {/* Description */}
          <div className="grid gap-1.5">
            <Label htmlFor="te-desc">Description</Label>
            <Input
              id="te-desc"
              placeholder="What did you work on?"
              value={form.description ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Billable */}
          <div className="flex items-center gap-3">
            <Switch
              id="te-billable"
              checked={form.billable ?? true}
              onCheckedChange={(v) => setForm((f) => ({ ...f, billable: v }))}
            />
            <Label htmlFor="te-billable">Billable</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.projectId || form.hours <= 0 || createEntry.isPending}
          >
            {createEntry.isPending ? 'Saving…' : 'Log Time'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const { data: summary, isLoading } = useTimeEntriesSummary({ startDate, endDate });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <div className="rounded-xl bg-blue-50 p-3 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Total Hours</p>
            <p className="text-2xl font-bold">{summary.totalHours}h</p>
            <p className="text-xs text-muted-foreground">{summary.entryCount} entries</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <div className="rounded-xl bg-green-50 p-3 text-green-600 dark:bg-green-900/20 dark:text-green-400">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Billable Hours</p>
            <p className="text-2xl font-bold">{summary.billableHours}h</p>
            <p className="text-xs text-muted-foreground">
              {summary.totalHours > 0
                ? `${Math.round((summary.billableHours / summary.totalHours) * 100)}%`
                : '0%'}
              {' '}of total
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground font-medium mb-2">Top Projects</p>
          {summary.byProject.slice(0, 3).map((p) => (
            <div key={p.projectId} className="flex items-center justify-between gap-2 py-0.5">
              <span className="flex items-center gap-1.5 text-sm truncate">
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0"
                  style={{ background: p.color }}
                />
                <span className="truncate">{p.projectName}</span>
              </span>
              <span className="text-sm font-medium shrink-0">{p.hours}h</span>
            </div>
          ))}
          {summary.byProject.length === 0 && (
            <p className="text-sm text-muted-foreground">No entries this week</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Weekly Grid ───────────────────────────────────────────────────────────────

function WeeklyGrid({
  days,
  entries,
  onDelete,
  onLogDay,
}: {
  days: Date[];
  entries: TimeEntry[];
  onDelete: (id: string) => void;
  onLogDay: (date: string) => void;
}) {
  // Group entries by date key
  const byDate = useMemo(() => {
    const map: Record<string, TimeEntry[]> = {};
    for (const e of entries) {
      const key = format(parseISO(e.date), 'yyyy-MM-dd');
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
    return map;
  }, [entries]);

  const dayTotals = days.map((d) => {
    const key = format(d, 'yyyy-MM-dd');
    return (byDate[key] ?? []).reduce((s, e) => s + e.hours, 0);
  });

  const weekTotal = dayTotals.reduce((s, h) => s + h, 0);

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      {/* Header row */}
      <div
        className="grid border-b bg-muted/40"
        style={{ gridTemplateColumns: `1fr repeat(${days.length}, minmax(110px, 1fr)) 80px` }}
      >
        <div className="px-4 py-2.5 text-xs font-medium text-muted-foreground" />
        {days.map((d) => (
          <div
            key={d.toISOString()}
            className={cn(
              'px-2 py-2.5 text-center',
              isToday(d) && 'bg-primary/5',
            )}
          >
            <p className="text-xs font-semibold">{format(d, 'EEE')}</p>
            <p
              className={cn(
                'text-lg font-bold leading-tight',
                isToday(d) ? 'text-primary' : 'text-foreground',
              )}
            >
              {format(d, 'd')}
            </p>
          </div>
        ))}
        <div className="px-2 py-2.5 text-center">
          <p className="text-xs font-semibold text-muted-foreground">Total</p>
        </div>
      </div>

      {/* Totals row */}
      <div
        className="grid border-b"
        style={{ gridTemplateColumns: `1fr repeat(${days.length}, minmax(110px, 1fr)) 80px` }}
      >
        <div className="px-4 py-2 flex items-center">
          <span className="text-sm font-medium text-muted-foreground">Daily totals</span>
        </div>
        {days.map((d, i) => {
          const key = format(d, 'yyyy-MM-dd');
          const h = dayTotals[i];
          return (
            <div
              key={d.toISOString()}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-2 px-2 cursor-pointer hover:bg-muted/50 transition-colors',
                isToday(d) && 'bg-primary/5',
              )}
              onClick={() => onLogDay(key)}
              title="Click to log time"
            >
              <span
                className={cn(
                  'text-sm font-semibold',
                  h === 0 ? 'text-muted-foreground/40' : h >= 8 ? 'text-green-600' : 'text-foreground',
                )}
              >
                {hoursLabel(h)}
              </span>
              <Plus className="h-3 w-3 text-muted-foreground/50" />
            </div>
          );
        })}
        <div className="flex items-center justify-center py-2">
          <span className="text-sm font-bold">{hoursLabel(weekTotal)}</span>
        </div>
      </div>

      {/* Entry rows — group by project */}
      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <Clock className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No time logged this week</p>
          <p className="text-xs text-muted-foreground/70">
            Click a day total above or use &quot;Log Time&quot; to get started
          </p>
        </div>
      ) : (
        // Group rows by project+task combination
        (() => {
          type RowKey = string;
          const rows: Record<
            RowKey,
            {
              project: TimeEntry['project'];
              task: TimeEntry['task'];
              description: string | null;
              byDate: Record<string, TimeEntry[]>;
              total: number;
            }
          > = {};

          for (const e of entries) {
            const key = `${e.projectId}__${e.taskId ?? 'none'}__${e.description ?? ''}`;
            const dateKey = format(parseISO(e.date), 'yyyy-MM-dd');
            if (!rows[key]) {
              rows[key] = {
                project: e.project,
                task: e.task,
                description: e.description,
                byDate: {},
                total: 0,
              };
            }
            if (!rows[key].byDate[dateKey]) rows[key].byDate[dateKey] = [];
            rows[key].byDate[dateKey].push(e);
            rows[key].total += e.hours;
          }

          return Object.entries(rows).map(([key, row]) => (
            <div
              key={key}
              className="grid border-b last:border-b-0 hover:bg-muted/20 transition-colors"
              style={{
                gridTemplateColumns: `1fr repeat(${days.length}, minmax(110px, 1fr)) 80px`,
              }}
            >
              {/* Label */}
              <div className="px-4 py-2.5 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full shrink-0"
                    style={{ background: row.project.color }}
                  />
                  <span className="text-xs font-medium truncate">{row.project.name}</span>
                </div>
                {row.task && (
                  <p className="text-xs text-muted-foreground truncate pl-3.5">{row.task.title}</p>
                )}
                {row.description && !row.task && (
                  <p className="text-xs text-muted-foreground truncate pl-3.5 italic">
                    {row.description}
                  </p>
                )}
              </div>

              {/* Day cells */}
              {days.map((d) => {
                const dateKey = format(d, 'yyyy-MM-dd');
                const cell = row.byDate[dateKey] ?? [];
                const cellHours = cell.reduce((s, e) => s + e.hours, 0);
                return (
                  <div
                    key={d.toISOString()}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1 px-2 py-2 group',
                      isToday(d) && 'bg-primary/5',
                    )}
                  >
                    {cellHours > 0 ? (
                      <>
                        <span className="text-sm font-medium">{hoursLabel(cellHours)}</span>
                        {cell.map((e) => (
                          <button
                            key={e.id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => onDelete(e.id)}
                            title="Delete entry"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </button>
                        ))}
                      </>
                    ) : (
                      <span className="text-muted-foreground/30 text-sm">–</span>
                    )}
                  </div>
                );
              })}

              {/* Row total */}
              <div className="flex items-center justify-center px-2 py-2.5">
                <span className="text-sm font-semibold">{hoursLabel(row.total)}</span>
              </div>
            </div>
          ));
        })()
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TimesheetsClient() {
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  const { start, end } = weekRange(weekAnchor);
  const days = eachDayOfInterval({ start, end });
  const startDate = format(start, 'yyyy-MM-dd');
  const endDate = format(end, 'yyyy-MM-dd');

  const { data: entriesPage, isLoading } = useTimeEntries({ startDate, endDate, pageSize: 200 });
  const entries: TimeEntry[] = entriesPage?.data ?? entriesPage ?? [];

  const deleteEntry = useDeleteTimeEntry();

  const openLogDialog = (date?: string) => {
    setDialogDate(date ?? format(new Date(), 'yyyy-MM-dd'));
    setDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Timesheets</h1>
          <p className="text-sm text-muted-foreground">Track and manage your logged hours</p>
        </div>
        <Button onClick={() => openLogDialog()} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Log Time
        </Button>
      </div>

      {/* Summary cards */}
      <SummaryCards startDate={startDate} endDate={endDate} />

      {/* Week navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekAnchor((w) => subWeeks(w, 1))}
          aria-label="Previous week"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-2 flex-1 justify-center">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {format(start, 'MMM d')} – {format(end, 'MMM d, yyyy')}
          </span>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekAnchor((w) => addWeeks(w, 1))}
          aria-label="Next week"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setWeekAnchor(new Date())}
          className="text-xs"
        >
          Today
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <WeeklyGrid
          days={days}
          entries={entries}
          onDelete={(id) => deleteEntry.mutate(id)}
          onLogDay={openLogDialog}
        />
      )}

      {/* Log time dialog */}
      <LogTimeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultDate={dialogDate}
      />
    </div>
  );
}
