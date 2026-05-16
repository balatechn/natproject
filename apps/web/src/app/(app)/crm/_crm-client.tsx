'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Plus, Search, TrendingUp, UserCheck, Phone, Mail, DollarSign, MoreHorizontal,
  MessageCircle, Loader2, Trash2, X, Send, CheckCircle, Clock, FileText,
  User, Building, Tag, ChevronDown, RefreshCw,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard } from '@/components/ui/stat-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  useCrmStats, useLeads, useLead, useCreateLead, useUpdateLead,
  useUpdateLeadStatus, useDeleteLead, useLeadActivities, useCreateActivity,
  useWhatsAppMessages, useSendWhatsApp, useCustomers,
} from '@/hooks/use-crm';
import { useToast } from '@/hooks/use-toast';

// ── Constants ──────────────────────────────────────────────────────────────────

const PIPELINE_STAGES: { id: string; label: string; dot: string }[] = [
  { id: 'NEW',        label: 'New',        dot: 'bg-blue-500' },
  { id: 'CONTACTED',  label: 'Contacted',  dot: 'bg-purple-500' },
  { id: 'QUALIFIED',  label: 'Qualified',  dot: 'bg-amber-500' },
  { id: 'PROPOSAL',   label: 'Proposal',   dot: 'bg-orange-500' },
  { id: 'WON',        label: 'Won',        dot: 'bg-green-500' },
  { id: 'LOST',       label: 'Lost',       dot: 'bg-red-500' },
];

const STAGE_BORDER: Record<string, string> = {
  NEW: 'border-t-blue-500', CONTACTED: 'border-t-purple-500',
  QUALIFIED: 'border-t-amber-500', PROPOSAL: 'border-t-orange-500',
  WON: 'border-t-green-500', LOST: 'border-t-red-500',
};

const STATUS_BADGE_VARIANT: Record<string, any> = {
  NEW: 'info', CONTACTED: 'outline', QUALIFIED: 'warning',
  PROPOSAL: 'warning', WON: 'success', LOST: 'destructive', UNQUALIFIED: 'outline',
};

const PRIORITY_BADGE: Record<string, any> = {
  HIGH: 'destructive', MEDIUM: 'warning', LOW: 'outline', NONE: 'outline',
};

// ── Create Lead Form ───────────────────────────────────────────────────────────

const leadSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName:  z.string().optional(),
  email:     z.string().email().optional().or(z.literal('')),
  phone:     z.string().optional(),
  companyName: z.string().optional(),
  estimatedValue: z.coerce.number().optional(),
  source:    z.string().optional(),
  status:    z.string().default('NEW'),
});
type LeadForm = z.infer<typeof leadSchema>;

function CreateLeadDialog({ onCreated }: { onCreated?: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createLead = useCreateLead();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<LeadForm>({
    resolver: zodResolver(leadSchema),
    defaultValues: { status: 'NEW' },
  });

  const onSubmit = async (values: LeadForm) => {
    try {
      const payload = {
        name: `${values.firstName} ${values.lastName ?? ''}`.trim(),
        email: values.email || undefined,
        phone: values.phone || undefined,
        company: values.companyName || undefined,
        value: values.estimatedValue,
        source: values.source || undefined,
        status: values.status ?? 'NEW',
      };
      const lead = await createLead.mutateAsync(payload as any);
      toast({ title: 'Lead created' });
      reset();
      setOpen(false);
      onCreated?.(lead?.id ?? lead?.data?.id);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> Add Lead</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New Lead</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">First Name *</Label>
              <Input className="h-8" {...register('firstName')} />
              {errors.firstName && <p className="text-xs text-destructive">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Last Name</Label>
              <Input className="h-8" {...register('lastName')} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Email</Label>
            <Input className="h-8" type="email" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Phone (WhatsApp)</Label>
              <Input className="h-8" {...register('phone')} placeholder="+55 11 9..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Est. Value ($)</Label>
              <Input className="h-8" type="number" {...register('estimatedValue')} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Company</Label>
            <Input className="h-8" {...register('companyName')} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Source</Label>
            <Input className="h-8" {...register('source')} placeholder="Website, Referral..." />
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── WhatsApp Panel ─────────────────────────────────────────────────────────────

function WhatsAppPanel({ leadId, phone }: { leadId: string; phone: string }) {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, refetch, isRefetching } = useWhatsAppMessages(leadId);
  const send = useSendWhatsApp(leadId);
  const { toast } = useToast();

  const messages: any[] = data?.messages ?? data ?? [];

  const handleSend = async () => {
    if (!text.trim()) return;
    try {
      await send.mutateAsync(text.trim());
      setText('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err: any) {
      toast({
        title: 'Could not send message',
        description: err.response?.data?.message ?? 'Evolution API may not be configured',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col h-72 rounded-xl border bg-muted/10 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-card">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-green-500" />
          <span className="text-xs font-semibold">WhatsApp</span>
          <span className="text-[10px] text-muted-foreground">{phone}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={cn('h-3 w-3', isRefetching && 'animate-spin')} />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3 py-2">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-1/2 ml-auto" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-muted-foreground">
            <MessageCircle className="h-8 w-8 opacity-20 mb-1" />
            <p className="text-xs">No messages yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg: any, i: number) => {
              const isOutbound = msg.fromMe ?? msg.direction === 'outbound';
              return (
                <div key={msg.id ?? i} className={cn('flex', isOutbound ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[80%] rounded-xl px-3 py-1.5 text-xs',
                    isOutbound
                      ? 'bg-green-500 text-white rounded-br-sm'
                      : 'bg-card border rounded-bl-sm'
                  )}>
                    <p className="leading-relaxed">{msg.body ?? msg.message ?? msg.text}</p>
                    <p className={cn('text-[9px] mt-0.5 text-right', isOutbound ? 'text-green-100' : 'text-muted-foreground')}>
                      {msg.timestamp
                        ? format(new Date(typeof msg.timestamp === 'number' ? msg.timestamp * 1000 : msg.timestamp), 'HH:mm')
                        : ''}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      <div className="flex items-center gap-2 px-3 py-2 border-t bg-card">
        <Input
          className="h-7 text-xs"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
        />
        <Button size="icon" className="h-7 w-7 shrink-0" onClick={handleSend} disabled={send.isPending || !text.trim()}>
          {send.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  );
}

// ── Lead Detail Sheet ──────────────────────────────────────────────────────────

function LeadDetailSheet({
  leadId,
  open,
  onClose,
}: {
  leadId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { data: lead, isLoading } = useLead(leadId);
  const updateLead = useUpdateLead(leadId);
  const deleteLead = useDeleteLead();
  const { data: activitiesData } = useLeadActivities(leadId);
  const createActivity = useCreateActivity(leadId);
  const [activityNote, setActivityNote] = useState('');
  const [activityType, setActivityType] = useState('NOTE');

  const activities: any[] = activitiesData?.data ?? activitiesData ?? [];

  const handleStatusChange = async (status: string) => {
    try {
      await updateLead.mutateAsync({ status });
      toast({ title: 'Status updated' });
    } catch {
      toast({ title: 'Failed', variant: 'destructive' });
    }
  };

  const handleAddActivity = async () => {
    if (!activityNote.trim()) return;
    try {
      await createActivity.mutateAsync({ type: activityType, note: activityNote });
      setActivityNote('');
      toast({ title: 'Activity logged' });
    } catch {
      toast({ title: 'Failed', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this lead?')) return;
    await deleteLead.mutateAsync(leadId);
    onClose();
    toast({ title: 'Lead deleted' });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col" side="right">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center justify-between pr-6">
            <span className="truncate">
              {isLoading ? <Skeleton className="h-5 w-40" /> : lead ? (lead.name ?? 'Lead') : 'Lead'}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-3 pt-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
          </div>
        ) : (
          <ScrollArea className="flex-1 pr-1">
            <div className="space-y-5 pb-4">
              {/* Status + Value */}
              <div className="flex items-center gap-3 flex-wrap">
                <Select value={lead?.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STAGES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                    <SelectItem value="UNQUALIFIED">Unqualified</SelectItem>
                  </SelectContent>
                </Select>
                {lead?.value && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <DollarSign className="h-3 w-3" />
                    {Number(lead.value).toLocaleString()}
                  </Badge>
                )}
                {lead?.source && <Badge variant="secondary" className="text-[10px]">{lead.source}</Badge>}
              </div>

              {/* Contact info */}
              <div className="space-y-2 text-sm">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contact</h3>
                {lead?.company && (
                  <div className="flex items-center gap-2">
                    <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{lead.company}</span>
                  </div>
                )}
                {lead?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <a href={`mailto:${lead.email}`} className="hover:underline text-primary">{lead.email}</a>
                  </div>
                )}
                {lead?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <a href={`tel:${lead.phone}`} className="hover:underline">{lead.phone}</a>
                  </div>
                )}
                {lead?.createdAt && (
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <Clock className="h-3 w-3" />
                    Created {formatDistanceToNow(parseISO(lead.createdAt), { addSuffix: true })}
                  </div>
                )}
              </div>

              {/* WhatsApp panel */}
              {lead?.phone && (
                <>
                  <Separator />
                  <WhatsAppPanel leadId={leadId} phone={lead.phone} />
                </>
              )}

              <Separator />

              {/* Activity log */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Activity</h3>
                <div className="space-y-2 p-3 rounded-xl border bg-muted/20">
                  <div className="flex items-center gap-2">
                    <Select value={activityType} onValueChange={setActivityType}>
                      <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['NOTE', 'CALL', 'EMAIL', 'MEETING', 'TASK'].map((t) => (
                          <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    rows={2}
                    className="text-xs resize-none"
                    placeholder="Add a note or log an activity..."
                    value={activityNote}
                    onChange={(e) => setActivityNote(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="h-7 text-xs w-full"
                    onClick={handleAddActivity}
                    disabled={createActivity.isPending || !activityNote.trim()}
                  >
                    {createActivity.isPending ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Plus className="mr-1.5 h-3 w-3" />}
                    Log Activity
                  </Button>
                </div>
                <div className="space-y-2">
                  {activities.map((act: any) => (
                    <div key={act.id} className="flex gap-2.5 text-xs">
                      <div className="shrink-0 mt-0.5">
                        {act.type === 'CALL' ? <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          : act.type === 'EMAIL' ? <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          : act.type === 'MEETING' ? <User className="h-3.5 w-3.5 text-muted-foreground" />
                          : act.type === 'TASK' ? <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          : <FileText className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] text-muted-foreground mb-0.5">
                          <span className="font-medium text-foreground">{act.type}</span>
                          {act.createdAt && ` · ${formatDistanceToNow(parseISO(act.createdAt), { addSuffix: true })}`}
                        </p>
                        <p className="leading-snug">{act.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Lead Card (Kanban) ─────────────────────────────────────────────────────────

function LeadCard({
  lead,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  lead: any;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onClick}
      className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-all cursor-pointer p-3 space-y-2 active:opacity-70"
    >
      <div className="flex items-start justify-between gap-1">
        <p className="text-xs font-semibold leading-tight line-clamp-2">
          {lead.name}
        </p>
        {lead.priority && lead.priority !== 'NONE' && (
          <Badge variant={PRIORITY_BADGE[lead.priority] ?? 'outline'} className="text-[9px] shrink-0">{lead.priority}</Badge>
        )}
      </div>
      {lead.company && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Building className="h-3 w-3" />
          <span className="truncate">{lead.company}</span>
        </div>
      )}
      <div className="flex items-center justify-between">
        {lead.value ? (
          <span className="text-[10px] font-medium text-green-600 dark:text-green-400">
            ${Number(lead.value).toLocaleString()}
          </span>
        ) : <span />}
        {lead.phone && <MessageCircle className="h-3 w-3 text-green-500" title="Has WhatsApp" />}
      </div>
    </div>
  );
}

// ── Pipeline Kanban ────────────────────────────────────────────────────────────

function PipelineKanban({
  leads,
  onLeadClick,
}: {
  leads: any[];
  onLeadClick: (id: string) => void;
}) {
  const updateStatus = useUpdateLeadStatus();
  const dragLeadId = useRef<string | null>(null);

  const handleDragStart = useCallback((leadId: string) => (e: React.DragEvent) => {
    dragLeadId.current = leadId;
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDrop = useCallback((stageId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragLeadId.current) {
      updateStatus.mutate({ id: dragLeadId.current, status: stageId });
      dragLeadId.current = null;
    }
  }, [updateStatus]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 min-h-[400px]">
      {PIPELINE_STAGES.map((stage) => {
        const colLeads = leads.filter((l) => l.status === stage.id);
        const colValue = colLeads.reduce((s, l) => s + (Number(l.value) || 0), 0);
        return (
          <div
            key={stage.id}
            className={cn('flex flex-col shrink-0 w-60 rounded-xl border-t-4 border bg-muted/20 overflow-hidden', STAGE_BORDER[stage.id])}
            onDragOver={onDragOver}
            onDrop={handleDrop(stage.id)}
          >
            <div className="flex items-center justify-between px-3 py-2.5 bg-card border-b">
              <div className="flex items-center gap-2">
                <span className={cn('h-2 w-2 rounded-full', stage.dot)} />
                <span className="text-xs font-semibold">{stage.label}</span>
                <span className="text-[10px] bg-muted rounded-full px-1.5 py-0.5 font-medium">{colLeads.length}</span>
              </div>
              {colValue > 0 && (
                <span className="text-[10px] text-muted-foreground font-medium">${colValue.toLocaleString()}</span>
              )}
            </div>
            <div className="flex-1 p-2 space-y-2 min-h-[120px]">
              {colLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onClick={() => onLeadClick(lead.id)}
                  onDragStart={handleDragStart(lead.id)}
                  onDragOver={onDragOver}
                  onDrop={handleDrop(stage.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function CRMPage() {
  const [search, setSearch] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const { data: stats, isLoading: statsLoading } = useCrmStats();
  const { data: leadsData, isLoading: leadsLoading } = useLeads({ search: search || undefined, limit: 200 });
  const { data: customersData, isLoading: customersLoading } = useCustomers({ search: search || undefined });

  const leads: any[] = leadsData?.data ?? [];
  const customers: any[] = customersData?.data ?? [];

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">CRM</h1>
            <p className="text-sm text-muted-foreground">Pipeline, leads & customer management</p>
          </div>
          <CreateLeadDialog onCreated={(id) => id && setSelectedLeadId(id)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))
          ) : (
            <>
              <StatCard title="Total Leads"     value={stats?.totalLeads ?? 0}    icon={TrendingUp}  color="blue" />
              <StatCard title="Won"              value={stats?.wonLeads ?? 0}       icon={CheckCircle} color="green" />
              <StatCard title="Customers"        value={stats?.totalCustomers ?? 0} icon={UserCheck}   color="amber" />
              <StatCard
                title="Pipeline Value"
                value={stats?.pipelineValue ? `$${Number(stats.pipelineValue).toLocaleString()}` : '$0'}
                icon={DollarSign}
                color="green"
              />
            </>
          )}
        </div>

        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <Tabs defaultValue="pipeline">
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="leads">All Leads ({leads.length})</TabsTrigger>
            <TabsTrigger value="customers">Customers ({customers.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-4">
            {leadsLoading ? (
              <div className="flex gap-3">
                {PIPELINE_STAGES.map((s) => <Skeleton key={s.id} className="h-64 w-60 shrink-0" />)}
              </div>
            ) : (
              <PipelineKanban leads={leads} onLeadClick={(id) => setSelectedLeadId(id)} />
            )}
          </TabsContent>

          <TabsContent value="leads" className="mt-4">
            {leadsLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : leads.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No leads found</div>
            ) : (
              <div className="space-y-2">
                {leads.map((lead: any) => (
                  <div
                    key={lead.id}
                    className="flex items-center gap-4 rounded-xl border bg-card px-4 py-3 hover:shadow-sm transition-shadow cursor-pointer"
                    onClick={() => setSelectedLeadId(lead.id)}
                  >
                    <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
                      {(lead.name?.[0] ?? lead.company?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {lead.name}
                        {lead.company ? <span className="text-muted-foreground ml-1 font-normal">— {lead.company}</span> : null}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
                        {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={STATUS_BADGE_VARIANT[lead.status] ?? 'outline'} className="text-[10px]">
                        {lead.status}
                      </Badge>
                      {lead.value && (
                        <span className="text-xs font-semibold text-muted-foreground hidden sm:block">
                          ${Number(lead.value).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="customers" className="mt-4">
            {customersLoading ? (
              <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : customers.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">No customers found</div>
            ) : (
              <div className="space-y-2">
                {customers.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-4 rounded-xl border bg-card px-4 py-3 hover:shadow-sm transition-shadow">
                    <div className="h-9 w-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-sm font-bold text-green-600 shrink-0">
                      {(c.name?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      {c.email && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Mail className="h-3 w-3" />{c.email}
                        </div>
                      )}
                    </div>
                    <Badge variant="success" className="text-[10px] shrink-0">Customer</Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedLeadId && (
        <LeadDetailSheet
          leadId={selectedLeadId}
          open={!!selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
        />
      )}
    </>
  );
}