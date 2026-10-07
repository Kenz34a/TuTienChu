import { useEffect, useState } from 'react';
import { api } from './client';
export interface ServerStatus {
  maintenance: boolean;
  message: string;
  revision: number;
  updatedAt: number;
}
export function useServerStatus(server: string) {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  useEffect(() => {
    let live = true,
      fetching = false;
    setStatus(null);
    const pull = async () => {
      if (fetching || !server) return;
      fetching = true;
      try {
        const r = await api<ServerStatus>(server, '/server-status');
        if (live) setStatus(r);
      } catch {
        /* Offline game still works. */
      } finally {
        fetching = false;
      }
    };
    void pull();
    const timer = setInterval(() => void pull(), 15000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [server]);
  return status;
}
