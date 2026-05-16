'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, DollarSign, Users, FolderKanban, Edit2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProject } from '@/hooks/use-projects';

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: 'text-red-500',
  HIGH: 'text-orange-500',
  MEDIUM: 'text-yellow-500',
  LOW: 'text-blue-400',
};

const STATUS_BADGE: Record<string, 'default' | 'success' | 'warning' | 'info' | 'destructive' | 'outline'> = {
  PLANNING: 'outline',
  IN_PROGRESS: 'info',
  ON_HOLD: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: project, isLoading } = useProject(id);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center py-20 gap-3 text-muted-foreground">
        <FolderKanban className="h-12 w-12 opacity-30" />
        <p>Project not found.</p>
        <Button variant="outline" asChild><Link href="/projects">← Back to Projects</Link></Button>
      </div>
    );
  }

  const tasks: any[] = project.tasks ?? [];
  const milestones: any[] = project.milestones ?? [];
  const members: any[] = project.members ?? [];
  const doneTasks = tasks.filter((t: any) => t.status === 'DONE').length;

  return (
    <div className="space-y-5">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link href="/projects"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color ?? '#3b82f6' }} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">{project.code}</span>
              <Badge variant={STATUS_BADGE[project.status] ?? 'outline'} className="text-[10px]">
                {project.status.replace('_', ' ')}
              </Badge>
              <span className={`text-xs font-semibold ${PRIORITY_COLOR[project.priority] ?? ''}`}>{project.priority}</span>
            </div>
            <h1 className="text-xl font-bold leading-tight">{project.name}</h1>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Progress</p>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={project.progress ?? 0} className="h-2 flex-1" />
              <span className="text-sm font-bold tabular-nums">{project.progress ?? 0}%</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Deadline</p>
              <p className="text-sm font-semibold">
                {project.endDate ? format(new Date(project.endDate), 'MMM d, yyyy') : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FolderKanban className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Tasks</p>
              <p className="text-sm font-semibold">{doneTasks}/{tasks.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Budget</p>
              <p className="text-sm font-semibold">
                {project.budget ? `$${Number(project.budget).toLocaleString()}` : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="milestones">Milestones ({milestones.length})</TabsTrigger>
          <TabsTrigger value="team">Team ({members.length})</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        {/* Tasks tab */}
        <TabsContent value="tasks" className="mt-4 space-y-2">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No tasks yet.</p>
          ) : tasks.map((task: any) => (
            <div key={task.id} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5 hover:bg-muted/50">
              <Badge variant={task.status === 'DONE' ? 'success' : task.status === 'IN_PROGRESS' ? 'info' : 'outline'} className="text-[10px] shrink-0">
                {task.status.replace('_', ' ')}
              </Badge>
              <span className="text-sm flex-1 min-w-0 truncate">{task.title}</span>
              <span className={`text-xs font-medium shrink-0 ${PRIORITY_COLOR[task.priority] ?? 'text-muted-foreground'}`}>{task.priority}</span>
              {task.dueDate && (
                <span className="text-xs text-muted-foreground shrink-0">{format(new Date(task.dueDate), 'MMM d')}</span>
              )}
            </div>
          ))}
        </TabsContent>

        {/* Milestones tab */}
        <TabsContent value="milestones" className="mt-4 space-y-2">
          {milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No milestones yet.</p>
          ) : milestones.map((m: any) => (
            <div key={m.id} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5">
              <div className={`w-2 h-2 rounded-full shrink-0 ${m.isCompleted ? 'bg-green-500' : 'bg-muted'}`} />
              <span className="text-sm flex-1 truncate">{m.title}</span>
              {m.dueDate && (
                <span className="text-xs text-muted-foreground">{format(new Date(m.dueDate), 'MMM d, yyyy')}</span>
              )}
            </div>
          ))}
        </TabsContent>

        {/* Team tab */}
        <TabsContent value="team" className="mt-4 space-y-2">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No team members assigned.</p>
          ) : members.map((m: any) => (
            <div key={m.id} className="flex items-center gap-3 rounded-lg border bg-card px-4 py-2.5">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {m.user?.name?.[0] ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.user?.name}</p>
                <p className="text-xs text-muted-foreground">{m.role}</p>
              </div>
              <Badge variant="outline" className="text-[10px]">{m.allocatedHours ?? 0}h</Badge>
            </div>
          ))}
        </TabsContent>

        {/* Overview tab */}
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardContent className="p-5 space-y-3">
              {project.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-sm leading-relaxed">{project.description}</p>
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="font-medium">{project.startDate ? format(new Date(project.startDate), 'PPP') : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">End Date</p>
                  <p className="font-medium">{project.endDate ? format(new Date(project.endDate), 'PPP') : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Budget</p>
                  <p className="font-medium">{project.budget ? `$${Number(project.budget).toLocaleString()}` : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Actual Cost</p>
                  <p className="font-medium">{project.actualCost ? `$${Number(project.actualCost).toLocaleString()}` : '—'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
