'use client';

import { useState } from 'react';
import { Search, TrendingUp, UserCheck, Phone, Mail, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard } from '@/components/ui/stat-card';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

function useCrmStats() {
  return useQuery({
    queryKey: ['crm', 'stats'],
    queryFn: () => apiClient.get('/crm/leads/stats').then((r) => r.data),
  });
}

function useLeads(params?: any) {
  return useQuery({
    queryKey: ['crm', 'leads', params],
    queryFn: () => apiClient.get('/crm/leads', { params }).then((r) => r.data),
  });
}

function useCustomers(params?: any) {
  return useQuery({
    queryKey: ['crm', 'customers', params],
    queryFn: () => apiClient.get('/crm/customers', { params }).then((r) => r.data),
  });
}

const LEAD_STATUS_VARIANT: Record<string, any> = {
  NEW: 'info',
  CONTACTED: 'outline',
  QUALIFIED: 'warning',
  NEGOTIATION: 'warning',
  WON: 'success',
  LOST: 'destructive',
  UNQUALIFIED: 'outline',
};

export default function CRMPage() {
  const [search, setSearch] = useState('');
  const { data: stats, isLoading: statsLoading } = useCrmStats();
  const { data: leadsData, isLoading: leadsLoading } = useLeads({ search: search || undefined });
  const { data: customersData, isLoading: customersLoading } = useCustomers({ search: search || undefined });

  const leads: any[] = leadsData?.data ?? [];
  const customers: any[] = customersData?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CRM</h1>
          <p className="text-sm text-muted-foreground">Leads, customers, and pipeline management</p>
        </div>
        <Button><Plus className="mr-2 h-4 w-4" /> Add Lead</Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <StatCard title="Total Leads" value={stats?.totalLeads ?? 0} icon={TrendingUp} color="blue" />
            <StatCard title="Won Leads" value={stats?.wonLeads ?? 0} icon={UserCheck} color="green" />
            <StatCard title="Total Customers" value={stats?.totalCustomers ?? 0} icon={UserCheck} color="amber" />
            <StatCard title="Pipeline Value" value={stats?.pipelineValue ? `$${Number(stats.pipelineValue).toLocaleString()}` : '$0'} icon={TrendingUp} color="green" />
          </>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-8" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="leads">
        <TabsList>
          <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
          <TabsTrigger value="customers">Customers ({customers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="mt-4">
          {leadsLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : leads.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">No leads found</div>
          ) : (
            <div className="space-y-2">
              {leads.map((lead: any) => (
                <div key={lead.id} className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3 hover:bg-muted/50">
                  <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
                    {(lead.firstName?.[0] ?? lead.companyName?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {lead.firstName} {lead.lastName} {lead.companyName ? `— ${lead.companyName}` : ''}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
                      {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
                    </div>
                  </div>
                  <Badge variant={LEAD_STATUS_VARIANT[lead.status] ?? 'outline'} className="text-[10px] shrink-0">
                    {lead.status}
                  </Badge>
                  {lead.estimatedValue && (
                    <span className="text-xs font-semibold text-muted-foreground shrink-0">
                      ${Number(lead.estimatedValue).toLocaleString()}
                    </span>
                  )}
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
                <div key={c.id} className="flex items-center gap-4 rounded-lg border bg-card px-4 py-3 hover:bg-muted/50">
                  <div className="h-9 w-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-sm font-bold text-green-600 shrink-0">
                    {(c.name?.[0] ?? '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {c.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span>}
                    </div>
                  </div>
                  <Badge variant="success" className="text-[10px] shrink-0">Customer</Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
