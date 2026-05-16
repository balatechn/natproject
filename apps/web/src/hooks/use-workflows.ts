import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export const workflowKeys = {
  all: ['workflows'] as const,
  lists: () => [...workflowKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...workflowKeys.lists(), filters] as const,
  detail: (id: string) => [...workflowKeys.all, 'detail', id] as const,
};

export function useWorkflows(params?: { search?: string; isActive?: boolean; page?: number }) {
  return useQuery({
    queryKey: workflowKeys.list(params ?? {}),
    queryFn: async () => {
      const { data } = await apiClient.get('/workflows', { params });
      return data;
    },
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: workflowKeys.detail(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/workflows/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiClient.post('/workflows', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.lists() }),
  });
}

export function useUpdateWorkflow(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiClient.patch(`/workflows/${id}`, body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: workflowKeys.lists() });
      qc.invalidateQueries({ queryKey: workflowKeys.detail(id) });
    },
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/workflows/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.lists() }),
  });
}

export function useToggleWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post(`/workflows/${id}/toggle`).then((r) => r.data),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: workflowKeys.lists() });
      qc.invalidateQueries({ queryKey: workflowKeys.detail(id) });
    },
  });
}
