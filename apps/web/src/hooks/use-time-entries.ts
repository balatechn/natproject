'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TimeEntry {
  id: string;
  userId: string;
  projectId: string;
  taskId: string | null;
  description: string | null;
  hours: number;
  date: string;
  billable: boolean;
  createdAt: string;
  user: { id: string; name: string; avatarUrl?: string | null };
  project: { id: string; name: string; color: string };
  task: { id: string; title: string } | null;
}

export interface TimeEntrySummary {
  totalHours: number;
  billableHours: number;
  entryCount: number;
  byProject: { projectId: string; projectName: string; color: string; hours: number }[];
  byUser: { userId: string; userName: string; avatarUrl: string | null; hours: number }[];
  byTask: { taskId: string; taskTitle: string; hours: number }[];
}

export interface CreateTimeEntryInput {
  projectId: string;
  taskId?: string;
  description?: string;
  hours: number;
  date: string; // YYYY-MM-DD
  billable?: boolean;
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const timeEntryKeys = {
  all: ['time-entries'] as const,
  list: (params: Record<string, string | undefined>) =>
    [...timeEntryKeys.all, 'list', params] as const,
  byTask: (taskId: string) => [...timeEntryKeys.all, 'task', taskId] as const,
  summary: (params: Record<string, string | undefined>) =>
    [...timeEntryKeys.all, 'summary', params] as const,
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useTimeEntries(params: {
  userId?: string;
  projectId?: string;
  taskId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}) {
  const query = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]),
  ) as Record<string, string>;

  return useQuery({
    queryKey: timeEntryKeys.list(query),
    queryFn: async () => {
      const res = await apiClient.get('/time-entries', { params });
      return res.data.data ?? res.data;
    },
  });
}

export function useTimeEntriesByTask(taskId: string | null) {
  return useQuery<TimeEntry[]>({
    queryKey: timeEntryKeys.byTask(taskId ?? ''),
    queryFn: async () => {
      const res = await apiClient.get(`/time-entries/task/${taskId}`);
      return res.data.data ?? res.data;
    },
    enabled: !!taskId,
  });
}

export function useTimeEntriesSummary(params: {
  projectId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const query = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined),
  ) as Record<string, string>;

  return useQuery<TimeEntrySummary>({
    queryKey: timeEntryKeys.summary(query),
    queryFn: async () => {
      const res = await apiClient.get('/time-entries/summary', { params });
      return res.data.data ?? res.data;
    },
  });
}

export function useCreateTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateTimeEntryInput) => {
      const res = await apiClient.post('/time-entries', dto);
      return res.data.data ?? res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: timeEntryKeys.all });
    },
  });
}

export function useUpdateTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...dto
    }: Partial<CreateTimeEntryInput> & { id: string }) => {
      const res = await apiClient.patch(`/time-entries/${id}`, dto);
      return res.data.data ?? res.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: timeEntryKeys.all });
    },
  });
}

export function useDeleteTimeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/time-entries/${id}`);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: timeEntryKeys.all });
    },
  });
}
