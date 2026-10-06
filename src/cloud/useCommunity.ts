import { useCallback, useEffect, useRef, useState } from 'react';
import { api, parseCloud, type CloudSave } from './client';
import type { useCloud } from './useCloud';
import type { World } from '../game/types';

export interface RankedPlayer {
  rank: number;
  id: string;
  name: string;
  stage: number;
  power: number;
  sect: string;
  clears: number;
  online: boolean;
  self: boolean;
}
export interface WorldBoss {
  id: string;
  name: string;
  world: World;
  symbol: string;
  minStage: number;
  stage: number;
  cycle: number;
  hp: number;
  maxHp: number;
  endsAt: number;
  respawnsAt: number;
  active: boolean;
  participants: number;
  damage: number;
  nextHitAt: number;
}
export interface CommunityData {
  serverTime: number;
  onlineCount: number;
  ranking: RankedPlayer[];
  topOnline: RankedPlayer[];
  bosses: WorldBoss[];
  rewards: { bossId: string; cycle: number; name: string }[];
}

export function useCommunity(cloud: ReturnType<typeof useCloud>) {
  const [data, setData] = useState<CommunityData | null>(null);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [clockOffset, setClockOffset] = useState(0);
  const current = useRef(cloud);
  current.current = cloud;
  const epoch = useRef(0),
    fetching = useRef(false),
    mounted = useRef(false);
  const refresh = useCallback(async (): Promise<void> => {
    const generation = epoch.current,
      c = current.current;
    if (fetching.current || !c.server) return;
    fetching.current = true;
    try {
      const next = await api<CommunityData>(
        c.account?.server || c.server,
        '/community',
        c.account?.token,
      );
      if (epoch.current !== generation) return;
      setData(next);
      setError('');
      setClockOffset(next.serverTime - Date.now());
    } catch (e) {
      if (epoch.current === generation)
        setError(e instanceof Error ? e.message : 'Chưa kết nối được cộng đồng.');
    } finally {
      fetching.current = false;
      if (mounted.current && epoch.current !== generation) void refresh();
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    epoch.current++;
    setData(null);
    setError('');
    void refresh();
    const timer = setInterval(() => void refresh(), 15000);
    const online = () => void refresh();
    window.addEventListener('online', online);
    return () => {
      mounted.current = false;
      epoch.current++;
      clearInterval(timer);
      window.removeEventListener('online', online);
    };
  }, [cloud.account?.token, cloud.server, refresh]);
  const interact = async (bossId: string, cycle: number, claim = false) => {
    const c = current.current,
      a = c.account;
    if (!a || working) {
      setError('Đăng nhập và đồng bộ nhân vật để tham gia boss thế giới.');
      return;
    }
    setWorking(true);
    setError('');
    try {
      await c.sync();
      if (claim) {
        const saved = await api<CloudSave>(a.server, '/save', a.token);
        const result = parseCloud(
          await api<CloudSave>(a.server, `/community/boss/${bossId}/claim`, a.token, {
            cycle,
            revision: saved.revision,
          }),
        );
        current.current.receive(result, a.token);
      } else await api(a.server, `/community/boss/${bossId}/attack`, a.token, { cycle });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa thực hiện được hành động.');
    } finally {
      setWorking(false);
    }
  };
  return { data, error, working, refresh, interact, clockOffset };
}
