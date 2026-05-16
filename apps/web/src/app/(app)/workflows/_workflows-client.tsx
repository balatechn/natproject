'use client';

import { useState } from 'react';
import {
  Plus, Search, Zap, MoreHorizontal, Play, Pause, Trash2, ArrowLeft, Loader2,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Edge, Node } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { WorkflowCanvas } from '@/components/workflow/workflow-canvas';
import { WorkflowNodeData } from '@/components/workflow/workflow-nodes';
import {
  useWorkflows, useWorkflow, useCreateWorkflow, useUpdateWorkflow,
  useDeleteWorkflow, useToggleWorkflow,
} from '@/hooks/use-workflows';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, parseISO } from 'date-fns';

const createSchema = z.object({
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

function WorkflowBuilder({ id, onBack }: { id: string; onBack: () => void }) {
  const { toast } = useToast();
  const { data: workflow, isLoading } = useWorkflow(id);
  const updateWorkflow = useUpdateWorkflow(id);
  const toggleWorkflow = useToggleWorkflow();

  const handleSave = async (nodes: Node<WorkflowNodeData>[], edges: Edge[]) => {
    try {
      await updateWorkflow.mutateAsync({ nodes, edges });
      toast({ title: 'Workflow saved' });
    } catch {
      toast({ title: 'Save failed', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 h-full">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="flex-1 w-full" />
      </div>
    );
  }

  const initialNodes: Node<WorkflowNodeData>[] = workflow?.nodes ?? [];
  const initialEdges: Edge[] = workflow?.edges ?? [];

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h2 className="text-lg font-bold leading-tight">{workflow?.name}</h2>
          {workflow?.description && (
            <p className="text-xs text-muted-foreground">{workflow.description}</p>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-[500px]">
        <WorkflowCanvas
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          isActive={workflow?.isActive ?? false}
          workflowName={workflow?.name ?? ''}
          onSave={handleSave}
          onToggle={() => toggleWorkflow.mutate(id)}
        />
      </div>
    </div>
  );
}

export default function WorkflowsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, isLoading } = useWorkflows({ search: search || undefined });
  const createWorkflow = useCreateWorkflow();
  const deleteWorkflow = useDeleteWorkflow();
  const toggleWorkflow = useToggleWorkflow();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });

  const onSubmit = async (values: CreateForm) => {
    try {
      const wf = await createWorkflow.mutateAsync({ ...values, nodes: [], edges: [] });
      toast({ title: 'Workflow created' });
      reset();
      setOpenCreate(false);
      // Open builder immediately
      const id = wf?.id ?? wf?.data?.id;
      if (id) setEditingId(id);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' });
    }
  };

  const workflows: any[] = data?.data ?? data ?? [];

  if (editingId) {
    return <WorkflowBuilder id={editingId} onBack={() => setEditingId(null)} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflow Automation</h1>
          <p className="text-sm text-muted-foreground">{workflows.length} workflows</p>
        </div>
        <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> New Workflow</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create Workflow</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input placeholder="Task overdue reminder" {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea rows={2} placeholder="What does this workflow do?" {...register('description')} />
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setOpenCreate(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create & Edit
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search workflows..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : workflows.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3 text-muted-foreground border rounded-xl bg-card">
          <Zap className="h-12 w-12 opacity-30" />
          <p className="font-medium">No workflows yet</p>
          <p className="text-sm">Create your first workflow to automate tasks and notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map((wf: any) => (
            <Card
              key={wf.id}
              className="cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => setEditingId(wf.id)}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div className={`p-2 rounded-lg shrink-0 ${wf.isActive ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                  <Zap className={`h-4 w-4 ${wf.isActive ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm">{wf.name}</span>
                    <Badge variant={wf.isActive ? 'success' : 'outline'} className="text-[10px]">
                      {wf.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {wf.description && (
                    <p className="text-xs text-muted-foreground truncate">{wf.description}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {wf._count?.nodes ?? wf.nodes?.length ?? 0} nodes
                    {wf.updatedAt && ` · Updated ${formatDistanceToNow(parseISO(wf.updatedAt), { addSuffix: true })}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); toggleWorkflow.mutate(wf.id); }}
                    title={wf.isActive ? 'Disable' : 'Enable'}
                  >
                    {wf.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingId(wf.id)}>Open Builder</DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); deleteWorkflow.mutate(wf.id); }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
