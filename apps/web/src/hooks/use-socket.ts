'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/index';

const WS_URL =
  (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_WS_URL) ||
  'ws://localhost:3001';

let sharedSocket: Socket | null = null;
let refCount = 0;

/**
 * Returns (and lazily connects) the shared Socket.io instance.
 * The socket authenticates via the JWT access token stored in localStorage.
 * All React Query caches are automatically invalidated on relevant events.
 */
export function useSocket() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const registered = useRef(false);

  const connect = useCallback(() => {
    if (!accessToken || !user) return;
    if (!sharedSocket || !sharedSocket.connected) {
      sharedSocket = io(`${WS_URL}/events`, {
        auth: { token: accessToken },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });
    }
  }, [accessToken, user]);

  useEffect(() => {
    connect();
    refCount += 1;

    return () => {
      refCount -= 1;
      if (refCount <= 0 && sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
        refCount = 0;
      }
    };
  }, [connect]);

  // Register event listeners once per hook mount
  useEffect(() => {
    if (!sharedSocket || registered.current) return;
    registered.current = true;

    sharedSocket.on('task.created', () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    });

    sharedSocket.on('task.updated', (task: { id: string; projectId: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      void queryClient.invalidateQueries({ queryKey: ['projects', task.projectId] });
    });

    sharedSocket.on('task.deleted', () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    });

    sharedSocket.on('project.updated', (project: { id: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      void queryClient.invalidateQueries({ queryKey: ['project', project.id] });
    });

    sharedSocket.on('comment.created', (comment: { taskId: string }) => {
      void queryClient.invalidateQueries({ queryKey: ['task', comment.taskId] });
      void queryClient.invalidateQueries({ queryKey: ['comments', comment.taskId] });
    });

    sharedSocket.on('notification.new', () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    return () => {
      registered.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return sharedSocket;
}
