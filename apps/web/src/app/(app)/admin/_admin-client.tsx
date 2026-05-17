'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { formatDistanceToNow, parseISO } from 'date-fns';
import {
  Users, Shield, Clock, Settings2, Key, Plus, Trash2,
  CheckCircle, XCircle, Loader2, Building, Globe, Briefcase, BarChart2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  useAdminStats, useAdminUsers, useUpdateUser, useAdminRoles,
  useApiKeys, useCreateApiKey, useRevokeApiKey,
  useAuditLog, useAdminSettings, useUpdateOrganization, useUpsertSetting,
} from '@/hooks/use-admin';

// ── KPI Strip ─────────────────────────────────────────────────────────────────

function StatStrip() {
  const { data: stats, isLoading } = useAdminStats();
  const items = [
    { label: 'Users',     value: stats?.users,     icon: Users },
    { label: 'Projects',  value: stats?.projects,  icon: Briefcase },
    { label: 'Tasks',     value: stats?.tasks,     icon: BarChart2 },
    { label: 'Workflows', value: stats?.workflows, icon: Settings2 },
  ];
  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      {items.map(({ label, value, icon: Icon }) => (
        <Card key={label}>
          <CardContent className="flex flex-col items-center justify-center py-4 gap-1">
            <Icon className="h-4 w-4 text-muted-foreground" />
            {isLoading ? <Skeleton className="h-6 w-10" /> : (
              <p className="text-xl font-bold">{value ?? 0}</p>
            )}
            <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE:      'default',
  INACTIVE:    'secondary',
  SUSPENDED:   'destructive',
};

function UsersTab() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminUsers({ search: search || undefined, page, pageSize: 20 });
  const updateUser = useUpdateUser();
  const { toast } = useToast();

  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateUser.mutateAsync({ id, status: next });
      toast({ title: `User ${next === 'ACTIVE' ? 'activated' : 'deactivated'}` });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const users = data?.data ?? [];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
        <span className="text-sm text-muted-foreground ml-auto">{data?.total ?? 0} users</span>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-9 w-full" /></TableCell></TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
            ) : users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {u.roles.map((ur) => (
                    <Badge key={ur.role.id} variant="outline" className="text-[10px] mr-1">{ur.role.name}</Badge>
                  ))}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE[u.status] ?? 'outline'} className="text-[10px]">{u.status}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {u.lastLoginAt ? formatDistanceToNow(parseISO(u.lastLoginAt), { addSuffix: true }) : '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDistanceToNow(parseISO(u.createdAt), { addSuffix: true })}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm" variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => toggleStatus(u.id, u.status)}
                    disabled={updateUser.isPending}
                  >
                    {u.status === 'ACTIVE' ? (
                      <><XCircle className="mr-1 h-3 w-3 text-red-500" /> Deactivate</>
                    ) : (
                      <><CheckCircle className="mr-1 h-3 w-3 text-green-500" /> Activate</>
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {(data?.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <span className="text-sm text-muted-foreground">{page} / {data?.totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= (data?.totalPages ?? 1)} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

// ── Roles Tab ─────────────────────────────────────────────────────────────────

function RolesTab() {
  const { data: roles, isLoading } = useAdminRoles();

  return (
    <div className="space-y-4">
      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
      ) : (roles ?? []).length === 0 ? (
        <div className="py-10 text-center text-muted-foreground">No roles configured</div>
      ) : (roles ?? []).map((role) => (
        <Card key={role.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold capitalize">{role.name}</CardTitle>
                {role.description && <CardDescription className="text-xs">{role.description}</CardDescription>}
              </div>
              {role.isSystem && <Badge variant="secondary" className="text-[10px]">System</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {role.permissions.length === 0 ? (
                <span className="text-xs text-muted-foreground">No permissions assigned</span>
              ) : role.permissions.map(({ permission: p }) => (
                <Badge key={p.id} variant="outline" className="text-[10px] font-mono">
                  {p.resource}:{p.action}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── API Keys Tab ──────────────────────────────────────────────────────────────

const apiKeySchema = z.object({
  name: z.string().min(1, 'Required'),
  scopes: z.string().optional(),
});
type ApiKeyForm = z.infer<typeof apiKeySchema>;

function ApiKeysTab() {
  const { data: keys, isLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ApiKeyForm>({ resolver: zodResolver(apiKeySchema) });

  const onSubmit = async (values: ApiKeyForm) => {
    try {
      const result = await createKey.mutateAsync({
        name: values.name,
        scopes: values.scopes ? values.scopes.split(',').map((s) => s.trim()).filter(Boolean) : [],
      });
      setNewKey(result.key);
      reset();
    } catch {
      toast({ title: 'Failed to create key', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">API Keys</h3>
          <p className="text-xs text-muted-foreground">Manage programmatic access tokens</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setNewKey(null); reset(); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-3 w-3" />New Key</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Create API Key</DialogTitle></DialogHeader>
            {newKey ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Copy this key — it will not be shown again.</p>
                <div className="rounded-lg border bg-muted p-3 font-mono text-xs break-all select-all">{newKey}</div>
                <DialogFooter>
                  <Button onClick={() => { navigator.clipboard.writeText(newKey); toast({ title: 'Copied!' }); }}>Copy</Button>
                  <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 mt-2">
                <div className="space-y-1">
                  <Label className="text-xs">Key Name *</Label>
                  <Input className="h-8" {...register('name')} placeholder="e.g. CI/CD Pipeline" />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Scopes (comma-separated)</Label>
                  <Input className="h-8" {...register('scopes')} placeholder="read:projects, write:tasks" />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}Generate
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
      ) : (keys ?? []).length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
          No API keys yet. Create one to enable programmatic access.
        </div>
      ) : (keys ?? []).map((k) => (
        <div key={k.id} className="rounded-xl border bg-card flex items-center gap-4 px-4 py-3">
          <Key className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{k.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs font-mono text-muted-foreground">{k.prefix}••••••••</span>
              {k.scopes.length > 0 && k.scopes.map((s) => (
                <Badge key={s} variant="secondary" className="text-[9px]">{s}</Badge>
              ))}
            </div>
          </div>
          <div className="text-xs text-muted-foreground shrink-0 text-right">
            {k.lastUsedAt ? `Used ${formatDistanceToNow(parseISO(k.lastUsedAt), { addSuffix: true })}` : 'Never used'}
            {k.expiresAt && <div className="text-[10px]">Expires {formatDistanceToNow(parseISO(k.expiresAt), { addSuffix: true })}</div>}
          </div>
          <Button
            size="icon" variant="ghost"
            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => revokeKey.mutate(k.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}

// ── Audit Log Tab ─────────────────────────────────────────────────────────────

function AuditLogTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAuditLog({ page, pageSize: 25 });
  const logs = data?.data ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>User</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No audit logs yet</TableCell></TableRow>
            ) : logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] font-mono">{log.action}</Badge>
                </TableCell>
                <TableCell className="text-xs">
                  <span className="text-muted-foreground">{log.resource}</span>
                  <span className="font-mono ml-1 text-[10px] text-muted-foreground truncate max-w-[80px] inline-block align-bottom">{log.resourceId.slice(0, 8)}…</span>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{log.userId?.slice(0, 8) ?? '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono">{log.ipAddress ?? '—'}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDistanceToNow(parseISO(log.createdAt), { addSuffix: true })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {(data?.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <span className="text-sm text-muted-foreground">{page} / {data?.totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= (data?.totalPages ?? 1)} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

// ── Settings Tab ──────────────────────────────────────────────────────────────

const orgSchema = z.object({
  name:     z.string().min(1, 'Required'),
  website:  z.string().url().optional().or(z.literal('')),
  industry: z.string().optional(),
});
type OrgForm = z.infer<typeof orgSchema>;

function SettingsTab() {
  const { data, isLoading } = useAdminSettings();
  const updateOrg = useUpdateOrganization();
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors, isSubmitting, isDirty }, reset } = useForm<OrgForm>({
    resolver: zodResolver(orgSchema),
    values: data?.organization ? {
      name: data.organization.name ?? '',
      website: data.organization.website ?? '',
      industry: data.organization.industry ?? '',
    } : undefined,
  });

  const onSubmit = async (values: OrgForm) => {
    try {
      await updateOrg.mutateAsync(values);
      toast({ title: 'Organization updated' });
      reset(values);
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      {/* Org profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><Building className="h-4 w-4" />Organization Profile</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-36 w-full" /> : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Organization Name *</Label>
                <Input {...register('name')} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1"><Globe className="h-3 w-3" /> Website</Label>
                <Input {...register('website')} placeholder="https://example.com" />
                {errors.website && <p className="text-xs text-destructive">{errors.website.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Industry</Label>
                <Select
                  onValueChange={(v) => reset({ ...data?.organization as any, industry: v })}
                  defaultValue={data?.organization?.industry ?? ''}
                >
                  <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                  <SelectContent>
                    {['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Education', 'Real Estate', 'Other'].map((i) => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" size="sm" disabled={isSubmitting || !isDirty}>
                {isSubmitting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}Save Changes
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Custom settings KV */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2"><Settings2 className="h-4 w-4" />Custom Settings</CardTitle>
          <CardDescription className="text-xs">Key-value pairs stored for your organization</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-20 w-full" /> : (data?.settings ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No custom settings configured.</p>
          ) : (
            <div className="space-y-2">
              {data!.settings.map((s) => (
                <div key={s.id} className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{s.key}</span>
                  <span className="text-muted-foreground flex-1 truncate">{JSON.stringify(s.value)}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatDistanceToNow(parseISO(s.updatedAt), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminClient() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary shrink-0" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
          <p className="text-sm text-muted-foreground">Users, roles, API keys, audit log & organization settings</p>
        </div>
      </div>

      <StatStrip />

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users"    className="gap-1.5"><Users className="h-3.5 w-3.5" />Users</TabsTrigger>
          <TabsTrigger value="roles"    className="gap-1.5"><Shield className="h-3.5 w-3.5" />Roles</TabsTrigger>
          <TabsTrigger value="api-keys" className="gap-1.5"><Key className="h-3.5 w-3.5" />API Keys</TabsTrigger>
          <TabsTrigger value="audit"    className="gap-1.5"><Clock className="h-3.5 w-3.5" />Audit Log</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5"><Settings2 className="h-3.5 w-3.5" />Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="users"    className="mt-5"><UsersTab /></TabsContent>
        <TabsContent value="roles"    className="mt-5"><RolesTab /></TabsContent>
        <TabsContent value="api-keys" className="mt-5"><ApiKeysTab /></TabsContent>
        <TabsContent value="audit"    className="mt-5"><AuditLogTab /></TabsContent>
        <TabsContent value="settings" className="mt-5"><SettingsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
