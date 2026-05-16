import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/index';

export function useMe() {
  const accessToken = useAuthStore((s) => s.accessToken);
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiClient.get('/auth/me');
      return res.data.data;
    },
    enabled: !!accessToken,
    staleTime: 5 * 60_000,
  });
}

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);
  const setAccessToken = useAuthStore((s) => s.setAccessToken);
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: { email: string; password: string; mfaCode?: string }) => {
      const res = await apiClient.post('/auth/login', data);
      return res.data.data;
    },
    onSuccess: (data) => {
      if (!data.mfaRequired) {
        setAccessToken(data.accessToken);
        setUser(data.user);
        router.push('/dashboard');
      }
    },
  });
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const router = useRouter();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => apiClient.post('/auth/logout'),
    onSettled: () => {
      clearAuth();
      qc.clear();
      router.push('/login');
    },
  });
}
