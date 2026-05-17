import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const [projects, tasks] = await Promise.all([
        apiClient.get('/projects/stats'),
        apiClient.get('/tasks/stats'),
      ]);
      return {
        projects: projects.data.data,
        tasks: tasks.data.data,
      };
    },
    staleTime: 60_000,
  });
}

export function useDashboardProjectReport() {
  return useQuery({
    queryKey: ['dashboard', 'project-report'],
    queryFn: async () => {
      const res = await apiClient.get('/reports/project-status');
      return res.data.data;
    },
    staleTime: 60_000,
  });
}
