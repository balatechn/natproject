'use client';

import { useEffect } from 'react';
import { useSocket } from '@/hooks/use-socket';

/**
 * Mount this inside the authenticated layout to ensure the WebSocket connection
 * is established as soon as the user is logged in.
 */
export function SocketProvider({ children }: { children: React.ReactNode }) {
  // Calling the hook is enough — it handles connect/disconnect lifecycle
  useSocket();
  return <>{children}</>;
}
