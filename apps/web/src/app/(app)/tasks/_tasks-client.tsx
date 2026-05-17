'use client';

import { useState } from 'react';
import { Search, Plus, Loader2, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTasks, useCreateTask } from '@/hooks/use-tasks';
import { useProjects } from '@/hooks/use-projects';
import { useToast } from '@/hooks/use-toast';
import { TaskDrawer } from '@/components/common/task-drawer';
import { format } from 'date-fns';

const COLUMNS = [
  { id: 'BACKLOG', label: 'Backlog', color: 'bg-slate-400' },
  { id: 'TODO', label: 'To Do', color: 'bg-blue-400' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-yellow-400' },
  { id: 'IN_REVIEW', label: 'In Review', color: 'bg-purple-400' },
  { id: 'DONE', label: 'Done', color: 'bg-green-500' },
];

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: 'destructive',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'outline',
  NONE: 'outline',
};

const createSchema = z.object({
  title: z.string().min(1, 'Title required'),
  description: z.string().optional(),
  priority: z.string().default('MEDIUM'),
  status: z.string().default('TODO'),
  dueDate: z.string().optional(),
  estimatedHours: z.coerce.number().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

function TaskCard({ task, onClick }: { task: any; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-card border rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow space-y-1.5"
    >
      <p className="text-sm font-medium leading-snug line-clamp-2">{task.title}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant={(PRIORITY_COLOR[task.priority] as any) ?? 'outline'} className="text-[10px] py-0">
          {task.priority}
        </Badge>
        {task.dueDate && (
          <span className="text-[10px] text-muted-foreground">{format(new Date(task.dueDate), 'MMM d')}</span>
        )}
      </div>
      {task.assignees?.length > 0 && (
        <div className="flex -space-x-1">
          {task.assignees.slice(0, 3).map((a: any) => (
            <div key={a.id} className="h-5 w-5 rounded-full bg-primary/20 border border-background flex items-center justify-center text-[9px] font-bold text-primary">
              {a.user?.name?.[0] ?? '?'}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TasksPage() {
  const { toast } = useToast();
  const [projectId, setProjectId] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskTitle, setSelectedTaskTitle] = useState<string | undefined>();

  const { data: projects } = useProjects({ limit: 50 });
  const { data: tasksData, isLoading } = useTasks({
    projectId: projectId || undefined,
    search: search || undefined,
    limit: 200,
  });
  const createTask = useCreateTask();

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { priority: 'MEDIUM', status: 'TODO' },
  });

  const onSubmit = async (values: CreateForm) => {
    try {
      await createTask.mutateAsync({ ...values, projectId: projectId || undefined });
      toast({ title: 'Task created!' });
      reset();
      setOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' });
    }
  };

  const tasks: any[] = tasksData?.data ?? [];

  const getColumnTasks = (status: string) => tasks.filter((t) => t.status === status);

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">{tasks.length} tasks</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Task</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input placeholder="Task title..." {...register('title')} />
                {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea rows={2} {...register('description')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select defaultValue="MEDIUM" onValueChange={(v) => setValue('priority', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['CRITICAL','HIGH','MEDIUM','LOW'].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select defaultValue="TODO" onValueChange={(v) => setValue('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {COLUMNS.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Due Date</Label>
                  <Input type="date" {...register('dueDate')} />
                </div>
                <div className="space-y-1.5">
                  <Label>Est. Hours</Label>
                  <Input type="number" {...register('estimatedHours')} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All projects</SelectItem>
            {(projects?.data ?? []).map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Kanban board */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {COLUMNS.map((col) => {
          const colTasks = getColumnTasks(col.id);
          return (
            <div key={col.id} className="flex-shrink-0 w-72 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                <h3 className="font-semibold text-sm">{col.label}</h3>
                <Badge variant="secondary" className="ml-auto text-xs">{colTasks.length}</Badge>
              </div>
              <div className="flex-1 space-y-2 min-h-[200px] rounded-xl bg-muted/30 p-2">
                {isLoading ? (
                  Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)
                ) : colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => {
                      setSelectedTaskId(task.id);
                      setSelectedTaskTitle(task.title);
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <TaskDrawer
        taskId={selectedTaskId}
        taskTitle={selectedTaskTitle}
        open={!!selectedTaskId}
        onOpenChange={(v) => { if (!v) setSelectedTaskId(null); }}
      />
    </div>
  );
}
