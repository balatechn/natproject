import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...taskKeys.lists(), filters] as const,
  detail: (id: string) => [...taskKeys.all, 'detail', id] as const,
  board: (projectId: string) => [...taskKeys.all, 'board', projectId] as const,
  stats: () => [...taskKeys.all, 'stats'] as const,
};

export function useTasks(params?: {
  projectId?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  search?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: taskKeys.list(params ?? {}),
    queryFn: async () => {
      const res = await apiClient.get('/tasks', { params });
      return res.data.data;
    },
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async () => {
      const res = await apiClient.get(`/tasks/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useKanbanBoard(projectId: string) {
  return useQuery({
    queryKey: taskKeys.board(projectId),
    queryFn: async () => {
      const res = await apiClient.get(`/tasks/board/${projectId}`);
      return res.data.data;
    },
    enabled: !!projectId,
  });
}

export function useTaskStats() {
  return useQuery({
    queryKey: taskKeys.stats(),
    queryFn: async () => {
      const res = await apiClient.get('/tasks/stats');
      return res.data.data;
    },
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiClient.post('/tasks', data);
      return res.data.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      if (vars.projectId) qc.invalidateQueries({ queryKey: taskKeys.board(vars.projectId as string) });
    },
  });
}

export function useUpdateTask(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiClient.patch(`/tasks/${id}`, data);
      return res.data.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() });
      qc.invalidateQueries({ queryKey: taskKeys.detail(id) });
      if (data?.projectId) qc.invalidateQueries({ queryKey: taskKeys.board(data.projectId) });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => apiClient.delete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.lists() }),
  });
}

export function useAddComment(taskId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const res = await apiClient.post(`/tasks/${taskId}/comments`, { body });
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.detail(taskId) }),
  });
}
