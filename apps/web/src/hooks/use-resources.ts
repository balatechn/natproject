import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export const resourceKeys = {
  all: ['resources'] as const,
  workload: (params: Record<string, unknown>) => [...resourceKeys.all, 'workload', params] as const,
  allocations: (params: Record<string, unknown>) => [...resourceKeys.all, 'allocations', params] as const,
  leaves: (params: Record<string, unknown>) => [...resourceKeys.all, 'leaves', params] as const,
};

export function useResourceWorkload(params?: {
  startDate?: string;
  endDate?: string;
  projectId?: string;
}) {
  return useQuery({
    queryKey: resourceKeys.workload(params ?? {}),
    queryFn: async () => {
      const { data } = await apiClient.get('/resources/workload', { params });
      return data;
    },
    staleTime: 30_000,
  });
}

export function useResourceAllocations(params?: {
  userId?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: resourceKeys.allocations(params ?? {}),
    queryFn: async () => {
      const { data } = await apiClient.get('/resources/allocations', { params });
      return data;
    },
    staleTime: 30_000,
  });
}

export function useResourceLeaves(params?: {
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: resourceKeys.leaves(params ?? {}),
    queryFn: async () => {
      const { data } = await apiClient.get('/resources/leaves', { params });
      return data;
    },
  });
}

export function useCreateAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiClient.post('/resources/allocations', body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: resourceKeys.all }),
  });
}

export function useDeleteAllocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/resources/allocations/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: resourceKeys.all }),
  });
}
