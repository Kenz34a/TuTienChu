import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState } from '../game/types';
import {
  ACCOUNT_KEY,
  SERVER_KEY,
  ApiError,
  api,
  defaultServer,
  fingerprint,
  parseCloud,
  readAccount,
  validateServer,
  type Account,
  type CloudSave,
} from './client';

type Status = 'guest' | 'syncing' | 'synced' | 'offline' | 'conflict' | 'expired';
export const statusLabels: Record<Status, string> = {
  guest: 'Chơi trên thiết bị',
  syncing: 'Đang đồng bộ',
  synced: 'Đã đồng bộ',
  offline: 'Chờ kết nối máy chủ',
  conflict: 'Cần chọn bản lưu',
  expired: 'Cần đăng nhập lại',
};
export function useCloud(
  state: GameState,
  restore: (s: GameState) => void,
  storageBlocked: boolean,
) {
  const [account, setAccount] = useState<Account | null>(readAccount);
  const [server, setServer] = useState(defaultServer);
  const [status, setStatus] = useState<Status>(account ? 'syncing' : 'guest');
  const [conflict, setConflict] = useState<CloudSave | null>(null);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const current = useRef({ state, restore, storageBlocked });
  current.current = { state, restore, storageBlocked };
  const session = useRef(account),
    pending = useRef<CloudSave | null>(null),
    busy = useRef(false),
    generation = useRef(0),
    lastPull = useRef(0),
    retryAt = useRef(0);
  const persist = useCallback((a: Account | null) => {
    session.current = a;
    setAccount(a);
    try {
      if (a) localStorage.setItem(ACCOUNT_KEY, JSON.stringify(a));
      else localStorage.removeItem(ACCOUNT_KEY);
    } catch {
      setError(
        'Không thể nhớ phiên đăng nhập trên thiết bị. Hãy xuất bản lưu trước khi đóng game.',
      );
    }
  }, []);
  const hold = useCallback((cloud: CloudSave) => {
    pending.current = cloud;
    setConflict(cloud);
    setStatus('conflict');
  }, []);
  const pump = useCallback(
    async (force = false) => {
      const a = session.current;
      if (
        !a ||
        busy.current ||
        pending.current ||
        current.current.storageBlocked ||
        (!force && Date.now() < retryAt.current)
      )
        return;
      busy.current = true;
      setWorking(true);
      const epoch = generation.current;
      const active = () => epoch === generation.current && session.current?.token === a.token;
      try {
        const snapshot = current.current.state,
          mark = fingerprint(snapshot);
        if (a.baseline === null) {
          const cloud = parseCloud(await api<CloudSave>(a.server, '/save', a.token));
          if (!active()) return;
          if (cloud.state) {
            hold(cloud);
            return;
          }
          persist({ ...a, revision: cloud.revision, baseline: '' });
        }
        const live = session.current!;
        if (mark !== live.baseline) {
          setStatus('syncing');
          const result = await api<{ revision: number; updatedAt: number }>(
            live.server,
            '/save',
            live.token,
            { revision: live.revision, state: snapshot },
            'PUT',
          );
          if (!active()) return;
          persist({ ...live, revision: result.revision, baseline: mark });
          lastPull.current = Date.now();
        } else if (force || Date.now() - lastPull.current >= 15000) {
          const cloud = parseCloud(await api<CloudSave>(live.server, '/save', live.token));
          if (!active()) return;
          lastPull.current = Date.now();
          if (cloud.revision !== live.revision && cloud.state) {
            if (fingerprint(current.current.state) !== live.baseline) {
              hold(cloud);
              return;
            }
            current.current.state = cloud.state;
            current.current.restore(cloud.state);
            persist({ ...live, revision: cloud.revision, baseline: fingerprint(cloud.state) });
          }
        }
        if (active()) {
          setStatus('synced');
          setError('');
          retryAt.current = 0;
        }
      } catch (failure) {
        if (!active()) return;
        if (failure instanceof ApiError && failure.cloud) hold(failure.cloud);
        else if (failure instanceof ApiError && failure.status === 401) {
          setStatus('expired');
          retryAt.current = Infinity;
          setError(failure.message);
        } else {
          setStatus('offline');
          retryAt.current = Date.now() + 10000;
          setError(
            failure instanceof Error
              ? failure.message
              : 'Chưa kết nối được máy chủ. Tiến trình vẫn lưu trên thiết bị.',
          );
        }
      } finally {
        busy.current = false;
        setWorking(false);
      }
    },
    [hold, persist],
  );
  useEffect(() => {
    const interval = setInterval(() => void pump(), 2000);
    const online = () => void pump(true);
    window.addEventListener('online', online);
    window.addEventListener('focus', online);
    void pump();
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', online);
      window.removeEventListener('focus', online);
    };
  }, [pump]);
  const authenticate = async (
    mode: 'login' | 'register',
    username: string,
    password: string,
    address: string,
  ) => {
    if (busy.current) return false;
    busy.current = true;
    setWorking(true);
    setError('');
    try {
      const origin = validateServer(address);
      const result = await api<{ token: string; user: { username: string }; cloud: CloudSave }>(
        origin,
        `/auth/${mode}`,
        undefined,
        { username, password },
      );
      const cloud = parseCloud(result.cloud);
      generation.current++;
      retryAt.current = 0;
      lastPull.current = 0;
      setServer(origin);
      try {
        localStorage.setItem(SERVER_KEY, origin);
      } catch {
        /* In-memory configuration still works. */
      }
      pending.current = null;
      setConflict(null);
      persist({
        token: result.token,
        username: result.user.username,
        server: origin,
        revision: cloud.revision,
        baseline: cloud.state ? null : '',
      });
      if (cloud.state) hold(cloud);
      else setStatus('syncing');
      return true;
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Không thể đăng nhập.');
      return false;
    } finally {
      busy.current = false;
      setWorking(false);
    }
  };
  const choose = async (source: 'cloud' | 'device') => {
    const a = session.current,
      cloud = pending.current;
    if (!a || !cloud || busy.current) return;
    if (source === 'cloud' && cloud.state) {
      current.current.state = cloud.state;
      current.current.restore(cloud.state);
      persist({ ...a, revision: cloud.revision, baseline: fingerprint(cloud.state) });
    } else {
      // The following PUT still uses compare-and-swap; a newer remote save will prompt again.
      persist({ ...a, revision: cloud.revision, baseline: '' });
    }
    pending.current = null;
    setConflict(null);
    retryAt.current = 0;
    setStatus('syncing');
    await pump(true);
  };
  const logout = async () => {
    const a = session.current;
    generation.current++;
    persist(null);
    pending.current = null;
    setConflict(null);
    setStatus('guest');
    setError('');
    if (a)
      try {
        await api(a.server, '/logout', a.token, {}, 'POST');
      } catch {
        /* Local sign-out also works offline; sessions expire after 30 days. */
      }
  };
  return {
    account,
    server,
    status,
    label: statusLabels[status],
    conflict,
    error,
    working,
    authenticate,
    choose,
    logout,
    sync: () => pump(true),
  };
}
