import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export const notifKeys = {
  all: ['notifications'] as const,
  list: (params: Record<string, unknown>) => [...notifKeys.all, params] as const,
  count: () => [...notifKeys.all, 'count'] as const,
};

export function useNotifications(params?: { unreadOnly?: boolean; page?: number }) {
  return useQuery({
    queryKey: notifKeys.list(params ?? {}),
    queryFn: async () => {
      const res = await apiClient.get('/notifications', { params });
      return res.data.data;
    },
    refetchInterval: 30_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notifKeys.count(),
    queryFn: async () => {
      const res = await apiClient.get('/notifications/unread-count');
      return res.data.data as number;
    },
    refetchInterval: 30_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.all });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => apiClient.patch('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notifKeys.all });
    },
  });
}
