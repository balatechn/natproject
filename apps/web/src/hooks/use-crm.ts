import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export const crmKeys = {
  all: ['crm'] as const,
  stats: () => [...crmKeys.all, 'stats'] as const,
  leads: () => [...crmKeys.all, 'leads'] as const,
  leadList: (p: Record<string, unknown>) => [...crmKeys.leads(), 'list', p] as const,
  lead: (id: string) => [...crmKeys.leads(), 'detail', id] as const,
  customers: () => [...crmKeys.all, 'customers'] as const,
  customerList: (p: Record<string, unknown>) => [...crmKeys.customers(), 'list', p] as const,
  customer: (id: string) => [...crmKeys.customers(), 'detail', id] as const,
  activities: (leadId: string) => [...crmKeys.lead(leadId), 'activities'] as const,
  whatsapp: (leadId: string) => [...crmKeys.lead(leadId), 'whatsapp'] as const,
};

// ── Stats ──────────────────────────────────────────────────────────────────────
export function useCrmStats() {
  return useQuery({
    queryKey: crmKeys.stats(),
    queryFn: () => apiClient.get('/crm/leads/stats').then((r) => r.data),
  });
}

// ── Leads ──────────────────────────────────────────────────────────────────────
export function useLeads(params?: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: crmKeys.leadList(params ?? {}),
    queryFn: () => apiClient.get('/crm/leads', { params }).then((r) => r.data),
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: crmKeys.lead(id),
    queryFn: () => apiClient.get(`/crm/leads/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiClient.post('/crm/leads', body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.leads() });
      qc.invalidateQueries({ queryKey: crmKeys.stats() });
    },
  });
}

export function useUpdateLead(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiClient.patch(`/crm/leads/${id}`, body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.leads() });
      qc.invalidateQueries({ queryKey: crmKeys.lead(id) });
    },
  });
}

export function useUpdateLeadStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.patch(`/crm/leads/${id}`, { status }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.leads() }),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/crm/leads/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: crmKeys.leads() });
      qc.invalidateQueries({ queryKey: crmKeys.stats() });
    },
  });
}

export function useLeadActivities(leadId: string) {
  return useQuery({
    queryKey: crmKeys.activities(leadId),
    queryFn: () => apiClient.get(`/crm/leads/${leadId}/activities`).then((r) => r.data),
    enabled: !!leadId,
  });
}

export function useCreateActivity(leadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiClient.post(`/crm/leads/${leadId}/activities`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.activities(leadId) }),
  });
}

// ── Customers ──────────────────────────────────────────────────────────────────
export function useCustomers(params?: { search?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: crmKeys.customerList(params ?? {}),
    queryFn: () => apiClient.get('/crm/customers', { params }).then((r) => r.data),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: crmKeys.customer(id),
    queryFn: () => apiClient.get(`/crm/customers/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

// ── WhatsApp (via NestJS → Evolution API) ─────────────────────────────────────
export function useWhatsAppMessages(leadId: string) {
  return useQuery({
    queryKey: crmKeys.whatsapp(leadId),
    queryFn: () => apiClient.get(`/crm/leads/${leadId}/whatsapp/messages`).then((r) => r.data),
    enabled: !!leadId,
    refetchInterval: 10_000,
  });
}

export function useSendWhatsApp(leadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      apiClient.post(`/crm/leads/${leadId}/whatsapp/send`, { message }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: crmKeys.whatsapp(leadId) }),
  });
}
