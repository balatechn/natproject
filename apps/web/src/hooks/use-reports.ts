'use client';

import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/axios';

const reportsKeys = {
  all: ['reports'] as const,
  projectStatus: () => [...reportsKeys.all, 'project-status'] as const,
  taskSummary:   () => [...reportsKeys.all, 'task-summary'] as const,
  taskSla:       () => [...reportsKeys.all, 'task-sla'] as const,
  teamWorkload:  () => [...reportsKeys.all, 'team-workload'] as const,
  resources:     () => [...reportsKeys.all, 'resource-utilization'] as const,
};

export function useProjectStatusReport() {
  return useQuery({
    queryKey: reportsKeys.projectStatus(),
    queryFn: async () => {
      const { data } = await axios.get('/reports/project-status');
      return data as Array<{
        id: string; code: string; name: string; status: string;
        progress: number; taskCount: number; tasksDone: number;
        completionRate: number; milestonesTotal: number; milestonesCompleted: number;
        budget: number | null; startDate: string | null; endDate: string | null;
      }>;
    },
  });
}

export function useTaskSummaryReport() {
  return useQuery({
    queryKey: reportsKeys.taskSummary(),
    queryFn: async () => {
      const { data } = await axios.get('/reports/task-summary');
      return data as {
        total: number;
        byStatus: Array<{ status: string; count: number }>;
        byPriority: Array<{ priority: string; count: number }>;
      };
    },
  });
}

export function useTaskSlaReport() {
  return useQuery({
    queryKey: reportsKeys.taskSla(),
    queryFn: async () => {
      const { data } = await axios.get('/reports/task-sla');
      return data as { total: number; breached: number; atRisk: number; complianceRate: number };
    },
  });
}

export function useTeamWorkloadReport() {
  return useQuery({
    queryKey: reportsKeys.teamWorkload(),
    queryFn: async () => {
      const { data } = await axios.get('/reports/team-workload');
      return data as Array<{
        id: string; name: string; jobTitle: string | null;
        total: number; completed: number; inProgress: number; todo: number; highPriority: number;
      }>;
    },
  });
}

export function useResourceUtilizationReport() {
  return useQuery({
    queryKey: reportsKeys.resources(),
    queryFn: async () => {
      const { data } = await axios.get('/reports/resource-utilization');
      return data as Array<{
        id: string; name: string; jobTitle: string | null;
        allocatedHours: number; maxHours: number; utilizationPct: number; leaveCount: number;
      }>;
    },
  });
}

