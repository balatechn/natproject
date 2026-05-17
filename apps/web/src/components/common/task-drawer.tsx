'use client';

import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Paperclip,
  Send,
  Trash2,
  Download,
  Activity,
  MessageSquare,
  Upload,
  X,
  FileText,
  Image,
  Clock,
  Plus,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/index';
import { cn } from '@/lib/utils';

import {
  useTimeEntriesByTask,
  useCreateTimeEntry,
  useDeleteTimeEntry,
  type TimeEntry,
} from '@/hooks/use-time-entries';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; avatarUrl?: string | null };
}

interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  signedUrl: string;
  createdAt: string;
}

interface ActivityEntry {
  id: string;
  action: string;
  entityType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  user?: { id: string; name: string; avatarUrl?: string | null } | null;
}

interface TaskDrawerProps {
  taskId: string | null;
  taskTitle?: string;
  projectId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fileSizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageMime(mime: string) {
  return mime.startsWith('image/');
}

function FileIcon({ mimeType }: { mimeType: string }) {
  return isImageMime(mimeType) ? (
    <Image className="h-4 w-4 text-blue-500" />
  ) : (
    <FileText className="h-4 w-4 text-muted-foreground" />
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CommentsTab({ taskId }: { taskId: string }) {
  const [body, setBody] = useState('');
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ['comments', taskId],
    queryFn: async () => {
      const res = await apiClient.get(`/tasks/${taskId}/comments`);
      return res.data.data ?? res.data;
    },
    enabled: !!taskId,
  });

  const addComment = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiClient.post(`/tasks/${taskId}/comments`, { body: text });
      return res.data;
    },
    onSuccess: () => {
      setBody('');
      void qc.invalidateQueries({ queryKey: ['comments', taskId] });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      await apiClient.delete(`/tasks/${taskId}/comments/${commentId}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['comments', taskId] });
    },
  });

  const handleSubmit = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    addComment.mutate(trimmed);
  };

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Comment list */}
      <ScrollArea className="flex-1 pr-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet. Be the first!</p>
        ) : (
          <div className="flex flex-col gap-4">
            {comments.map((c) => {
              const initials = c.author.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase();
              const isOwn = c.author.id === user?.id;
              return (
                <div key={c.id} className="flex gap-3 group">
                  <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                    {c.author.avatarUrl && (
                      <AvatarImage src={c.author.avatarUrl} alt={c.author.name} />
                    )}
                    <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium">{c.author.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                      </span>
                      {isOwn && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => deleteComment.mutate(c.id)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words mt-0.5">
                      {c.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <Separator />

      {/* New comment input */}
      <div className="flex gap-2 shrink-0">
        <Textarea
          placeholder="Add a comment…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="min-h-[60px] resize-none text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
          }}
        />
        <Button
          size="icon"
          className="shrink-0 self-end"
          onClick={handleSubmit}
          disabled={!body.trim() || addComment.isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function AttachmentsTab({ taskId }: { taskId: string }) {
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: attachments = [], isLoading } = useQuery<Attachment[]>({
    queryKey: ['attachments', taskId],
    queryFn: async () => {
      const res = await apiClient.get(`/attachments/task/${taskId}`);
      return res.data.data ?? res.data;
    },
    enabled: !!taskId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('file', file);
      form.append('taskId', taskId);
      await apiClient.post('/attachments', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['attachments', taskId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/attachments/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['attachments', taskId] });
    },
  });

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => uploadMutation.mutate(f));
  };

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Drop zone */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50',
        )}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <Upload className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
        <p className="text-sm text-muted-foreground">
          {uploadMutation.isPending ? 'Uploading…' : 'Drop files here or click to upload'}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">Max 50 MB per file</p>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* File list */}
      <ScrollArea className="flex-1 pr-1">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : attachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attachments yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {attachments.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-md border px-3 py-2 group"
              >
                <FileIcon mimeType={a.mimeType} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.name}</p>
                  <p className="text-xs text-muted-foreground">{fileSizeLabel(a.size)}</p>
                </div>
                <a
                  href={a.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </a>
                {user && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteMutation.mutate(a.id)}
                  >
                    <X className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function ActivityTab({ taskId }: { taskId: string }) {
  const { data: entries = [], isLoading } = useQuery<ActivityEntry[]>({
    queryKey: ['activity', taskId],
    queryFn: async () => {
      const res = await apiClient.get(`/tasks/${taskId}/activity`);
      return res.data.data ?? res.data;
    },
    enabled: !!taskId,
  });

  const actionLabel = (action: string, entityType: string) => {
    const labels: Record<string, string> = {
      create: `created ${entityType.toLowerCase()}`,
      update: `updated ${entityType.toLowerCase()}`,
      delete: `deleted ${entityType.toLowerCase()}`,
    };
    return labels[action] ?? action;
  };

  return (
    <ScrollArea className="h-full pr-2">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
      ) : (
        <div className="relative flex flex-col gap-0">
          {/* vertical line */}
          <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
          {entries.map((e) => {
            const initials = e.user?.name
              ? e.user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
              : 'SY';
            return (
              <div key={e.id} className="flex gap-3 pl-1 py-2">
                <div className="relative z-10 shrink-0">
                  <Avatar className="h-6 w-6 border-2 border-background">
                    {e.user?.avatarUrl && (
                      <AvatarImage src={e.user.avatarUrl} alt={e.user.name} />
                    )}
                    <AvatarFallback className="text-[9px] bg-muted">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-sm">
                    <span className="font-medium">{e.user?.name ?? 'System'}</span>{' '}
                    <span className="text-muted-foreground">{actionLabel(e.action, e.entityType)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ScrollArea>
  );
}

// ── TimeTab ───────────────────────────────────────────────────────────────────

function TimeTab({
  taskId,
  projectId,
}: {
  taskId: string;
  projectId?: string;
}) {
  const user = useAuthStore((s) => s.user);
  const { data: entries = [], isLoading } = useTimeEntriesByTask(taskId);
  const createEntry = useCreateTimeEntry();
  const deleteEntry = useDeleteTimeEntry();

  const [hours, setHours] = useState('1');
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [billable, setBillable] = useState(true);

  const totalHours = entries.reduce((s: number, e: TimeEntry) => s + e.hours, 0);

  const handleLog = async () => {
    const h = parseFloat(hours);
    if (!projectId || isNaN(h) || h <= 0) return;
    await createEntry.mutateAsync({
      projectId,
      taskId,
      hours: h,
      date,
      description: description.trim() || undefined,
      billable,
    });
    setHours('1');
    setDescription('');
  };

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Quick log form */}
      <div className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Log Time</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label htmlFor="tab-te-hours" className="text-xs">Hours</Label>
            <Input
              id="tab-te-hours"
              type="number"
              min={0.01}
              max={24}
              step={0.25}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="tab-te-date" className="text-xs">Date</Label>
            <Input
              id="tab-te-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="tab-te-desc" className="text-xs">Description (optional)</Label>
          <Input
            id="tab-te-desc"
            placeholder="What did you work on?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch id="tab-te-billable" checked={billable} onCheckedChange={setBillable} />
            <Label htmlFor="tab-te-billable" className="text-xs">Billable</Label>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={handleLog}
            disabled={!projectId || createEntry.isPending}
          >
            <Plus className="h-3.5 w-3.5" />
            {createEntry.isPending ? 'Saving…' : 'Log'}
          </Button>
        </div>
      </div>

      {/* Total */}
      {totalHours > 0 && (
        <div className="flex items-center gap-1.5 text-sm font-medium px-1">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Total logged:</span>
          <span>{totalHours}h</span>
        </div>
      )}

      {/* Entries list */}
      <ScrollArea className="flex-1 pr-1">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No time logged on this task yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map((e: TimeEntry) => (
              <div
                key={e.id}
                className="flex items-center gap-2 rounded-md border px-3 py-2 group text-sm"
              >
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium">
                    {e.hours}h
                    {!e.billable && (
                      <span className="ml-1.5 text-xs text-muted-foreground">(non-billable)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(e.date), 'MMM d, yyyy')}
                    {e.description && ` · ${e.description}`}
                    {' · '}{e.user.name}
                  </p>
                </div>
                {e.user.id === user?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteEntry.mutate(e.id)}
                  >
                    <X className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ── Main Drawer ───────────────────────────────────────────────────────────────

export function TaskDrawer({ taskId, taskTitle, projectId, open, onOpenChange }: TaskDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col w-full sm:max-w-lg p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <SheetTitle className="text-base leading-tight line-clamp-2">
            {taskTitle ?? 'Task Details'}
          </SheetTitle>
        </SheetHeader>

        {taskId ? (
          <Tabs defaultValue="comments" className="flex flex-col flex-1 overflow-hidden px-4 pb-4">
            <TabsList className="grid w-full grid-cols-4 mt-3 shrink-0">
              <TabsTrigger value="comments" className="gap-1 text-xs">
                <MessageSquare className="h-3.5 w-3.5" />
                Comments
              </TabsTrigger>
              <TabsTrigger value="attachments" className="gap-1 text-xs">
                <Paperclip className="h-3.5 w-3.5" />
                Files
              </TabsTrigger>
              <TabsTrigger value="time" className="gap-1 text-xs">
                <Clock className="h-3.5 w-3.5" />
                Time
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-1 text-xs">
                <Activity className="h-3.5 w-3.5" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="comments" className="flex-1 mt-3 overflow-hidden">
              <CommentsTab taskId={taskId} />
            </TabsContent>
            <TabsContent value="attachments" className="flex-1 mt-3 overflow-hidden">
              <AttachmentsTab taskId={taskId} />
            </TabsContent>
            <TabsContent value="time" className="flex-1 mt-3 overflow-hidden">
              <TimeTab taskId={taskId} projectId={projectId} />
            </TabsContent>
            <TabsContent value="activity" className="flex-1 mt-3 overflow-hidden">
              <ActivityTab taskId={taskId} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-muted-foreground">No task selected</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
