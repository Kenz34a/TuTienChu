import { useCallback, useEffect, useRef, useState } from 'react';
import { initialState, perform } from './game/engine';
import { decodeSave, loadGame, SAVE_KEY } from './game/storage';
import type { Action, GameState } from './game/types';

export function useGame() {
  const [loaded] = useState(loadGame);
  const [state, setState] = useState(loaded.state);
  const [storageBlocked, setStorageBlocked] = useState(Boolean(loaded.warning));
  const [saveFailed, setSaveFailed] = useState(false);
  const failureNotified = useRef(false);
  const [notice, setNotice] = useState<{ text: string; ok: boolean; id: number } | null>(
    loaded.warning ? { text: loaded.warning, ok: false, id: Date.now() } : null,
  );
  const current = useRef(state);
  const tell = useCallback(
    (text: string, ok = true) => setNotice({ text, ok, id: Date.now() }),
    [],
  );
  const commit = useCallback((next: GameState) => {
    current.current = next;
    setState(next);
  }, []);
  const act = useCallback(
    (action: Action) => {
      const result = perform(current.current, action);
      if (result.ok) commit(result.state);
      if (result.message) tell(result.message, result.ok);
      return result.ok;
    },
    [commit, tell],
  );
  useEffect(() => {
    if (storageBlocked) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      setSaveFailed(false);
      failureNotified.current = false;
    } catch {
      setSaveFailed(true);
      if (!failureNotified.current) {
        tell(
          'Không thể lưu trên thiết bị. Hãy xuất bản lưu trong Cài đặt để tránh mất tiến trình.',
          false,
        );
        failureNotified.current = true;
      }
    }
  }, [state, storageBlocked, tell]);
  useEffect(() => {
    act({ type: 'tick', now: Date.now() });
    const interval = setInterval(() => act({ type: 'tick', now: Date.now() }), 15000);
    const onFocus = () => act({ type: 'tick', now: Date.now() });
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [act]);
  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(null), 6500);
    return () => clearTimeout(timeout);
  }, [notice]);
  const importSave = (raw: string) => {
    try {
      const next = decodeSave(raw);
      commit(next);
      setStorageBlocked(false);
      tell('Đã khôi phục đạo lộ từ bản lưu.');
      return next;
    } catch (error) {
      tell(error instanceof Error ? error.message : 'Không thể đọc bản lưu.', false);
      return false;
    }
  };
  const reset = () => {
    commit(initialState());
    setStorageBlocked(false);
    tell('Một đạo lộ mới bắt đầu.');
  };
  const restoreCloud = useCallback(
    (next: GameState) => {
      const checked = decodeSave(JSON.stringify(next));
      commit(perform(checked, { type: 'tick', now: Date.now() }).state);
      setStorageBlocked(false);
    },
    [commit],
  );
  return {
    state,
    act,
    notice,
    dismissNotice: () => setNotice(null),
    tell,
    importSave,
    reset,
    storageBlocked,
    saveFailed,
    restoreCloud,
  };
}
