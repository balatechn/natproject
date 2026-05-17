'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';

const adminKeys = {
  all:        ['admin'] as const,
  stats:      () => [...adminKeys.all, 'stats'] as const,
  users:      (p?: object) => [...adminKeys.all, 'users', p ?? {}] as const,
  roles:      () => [...adminKeys.all, 'roles'] as const,
  permissions:() => [...adminKeys.all, 'permissions'] as const,
  apiKeys:    () => [...adminKeys.all, 'api-keys'] as const,
  auditLog:   (p?: object) => [...adminKeys.all, 'audit-log', p ?? {}] as const,
  settings:   () => [...adminKeys.all, 'settings'] as const,
};

export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: async () => {
      const { data } = await axios.get('/admin/stats');
      return data as { users: number; projects: number; tasks: number; workflows: number };
    },
  });
}

export function useAdminUsers(params?: { search?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: adminKeys.users(params),
    queryFn: async () => {
      const { data } = await axios.get('/admin/users', { params });
      return data as {
        data: Array<{
          id: string; name: string; email: string; status: string; jobTitle: string | null;
          avatarUrl: string | null; lastLoginAt: string | null; createdAt: string;
          roles: Array<{ role: { id: string; name: string } }>;
        }>;
        total: number; page: number; pageSize: number; totalPages: number;
      };
    },
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; status?: string; jobTitle?: string }) =>
      axios.patch(`/admin/users/${id}`, dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.all }),
  });
}

export function useAdminRoles() {
  return useQuery({
    queryKey: adminKeys.roles(),
    queryFn: async () => {
      const { data } = await axios.get('/admin/roles');
      return data as Array<{
        id: string; name: string; description: string | null; isSystem: boolean;
        permissions: Array<{ permission: { id: string; resource: string; action: string; description: string | null } }>;
      }>;
    },
  });
}

export function useAdminPermissions() {
  return useQuery({
    queryKey: adminKeys.permissions(),
    queryFn: async () => {
      const { data } = await axios.get('/admin/permissions');
      return data as Array<{ id: string; resource: string; action: string; description: string | null }>;
    },
  });
}

export function useApiKeys() {
  return useQuery({
    queryKey: adminKeys.apiKeys(),
    queryFn: async () => {
      const { data } = await axios.get('/admin/api-keys');
      return data as Array<{
        id: string; name: string; prefix: string; scopes: string[];
        expiresAt: string | null; lastUsedAt: string | null; createdAt: string;
      }>;
    },
  });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { name: string; scopes?: string[]; expiresAt?: string }) =>
      axios.post('/admin/api-keys', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.apiKeys() }),
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => axios.delete(`/admin/api-keys/${id}`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.apiKeys() }),
  });
}

export function useAuditLog(params?: { userId?: string; resource?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: adminKeys.auditLog(params),
    queryFn: async () => {
      const { data } = await axios.get('/admin/audit-log', { params });
      return data as {
        data: Array<{
          id: string; userId: string | null; action: string; resource: string;
          resourceId: string; before: unknown; after: unknown;
          ipAddress: string | null; userAgent: string | null; createdAt: string;
        }>;
        total: number; page: number; pageSize: number; totalPages: number;
      };
    },
  });
}

export function useAdminSettings() {
  return useQuery({
    queryKey: adminKeys.settings(),
    queryFn: async () => {
      const { data } = await axios.get('/admin/settings');
      return data as {
        settings: Array<{ id: string; key: string; value: unknown; updatedAt: string }>;
        organization: { id: string; name: string; slug: string; logoUrl: string | null; website: string | null; industry: string | null };
      };
    },
  });
}

export function useUpdateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: Partial<{ name: string; logoUrl: string; website: string; industry: string }>) =>
      axios.patch('/admin/organization', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.settings() }),
  });
}

export function useUpsertSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { key: string; value: unknown }) => axios.patch('/admin/settings', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.settings() }),
  });
}
