import { MAX_STAGE } from './game/stages';
import { useCallback, useEffect, useRef, useState } from 'react';
import { QUESTS, questClaimed, realmName, stoneCost, xpNeeded } from './game/data';
import { qiCost, canPayBreakthroughTier } from './game/expansion';
import { dayKey } from './game/engine';
import type { GameState } from './game/types';
import type { CommunityData } from './cloud/useCommunity';
import { TITLES } from './game/titles';

export interface GameNotification {
  id: string;
  title: string;
  text: string;
  time: number;
  read: boolean;
  kind: 'boss' | 'online' | 'quest' | 'realm' | 'title';
}
function read(key: string): GameNotification[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(raw)
      ? raw
          .filter(
            (n) =>
              n &&
              typeof n.id === 'string' &&
              typeof n.title === 'string' &&
              typeof n.text === 'string' &&
              Number.isFinite(n.time) &&
              typeof n.read === 'boolean' &&
              ['boss', 'online', 'quest', 'realm', 'title'].includes(n.kind),
          )
          .slice(0, 50)
      : [];
  } catch {
    return [];
  }
}
export function useNotifications(
  state: GameState,
  community: CommunityData | null,
  identity: string,
) {
  const key = `van-tien-ky.notifications.v1:${identity}`;
  const [notifications, setNotifications] = useState<GameNotification[]>(() => read(key));
  const [scope, setScope] = useState(key);
  const seen = useRef(new Set<string>(read(key).map((n) => n.id)));
  if (scope !== key) {
    setScope(key);
    setNotifications(read(key));
    seen.current = new Set(read(key).map((n) => n.id));
  }
  const push = useCallback((entry: Omit<GameNotification, 'time' | 'read'>) => {
    if (seen.current.has(entry.id)) return;
    seen.current.add(entry.id);
    setNotifications((old) =>
      old.some((n) => n.id === entry.id)
        ? old
        : [{ ...entry, time: Date.now(), read: false }, ...old].slice(0, 50),
    );
  }, []);
  useEffect(() => {
    if (scope === key)
      try {
        localStorage.setItem(key, JSON.stringify(notifications));
      } catch {
        /* Notifications remain available in memory. */
      }
  }, [notifications, key, scope]);
  useEffect(() => {
    if (scope !== key) return;
    for (const title of TITLES)
      if (state.titles.owned.includes(title.id))
        push({
          id: `title-${title.id}`,
          kind: 'title',
          title: 'Phong hào thức tỉnh',
          text: `Đã mở danh hiệu “${title.name}”. Vào Danh hiệu để trang bị gia trì và hiệu ứng.`,
        });
    if (
      state.stage < MAX_STAGE &&
      state.xp >= xpNeeded(state.stage) &&
      state.lingqi >= qiCost(state.stage) &&
      state.stones >= stoneCost(state.stage) &&
      canPayBreakthroughTier(state)
    )
      push({
        id: `realm-${state.stage}`,
        kind: 'realm',
        title: 'Đạo cơ đã vững',
        text: `Đủ tu vi, linh khí và linh thạch để đột phá ${realmName(state.stage + 1)}.`,
      });
    for (const q of QUESTS)
      if (
        (!q.reveal || q.reveal(state)) &&
        state.stage >= q.minStage &&
        !questClaimed(state, q) &&
        q.progress(state) >= q.target
      )
        push({
          id: `quest-${q.id}${q.category === 'daily' ? `-${dayKey()}` : ''}`,
          kind: 'quest',
          title: 'Nhiệm vụ hoàn thành',
          text: `“${q.name}” đang chờ bạn nhận thưởng.`,
        });
  }, [state, push, key, scope]);
  useEffect(() => {
    if (!community || scope !== key) return;
    for (const boss of community.bosses)
      if (boss.active)
        push({
          id: `${boss.id}-${boss.cycle}`,
          kind: 'boss',
          title: 'Boss thế giới hiện thế',
          text: `${boss.name} đã xuất hiện. Có thể tham chiến đến ${new Date(boss.endsAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })}.`,
        });
    // Once per browser session, welcome the player with actual online leaders.
    const entry = `online-${identity}-${Math.floor(performance.timeOrigin)}`;
    push({
      id: entry,
      kind: 'online',
      title: `Chào mừng trở lại · ${community.onlineCount} đạo hữu online`,
      text: community.topOnline.length
        ? `Đang dẫn đầu: ${community.topOnline
            .slice(0, 3)
            .map((p) => `${p.name} (${realmName(p.stage)})`)
            .join(' · ')}.`
        : 'Chưa có nhân vật đã đồng bộ nào đang online. Hãy đăng nhập để hiện diện trong tam giới.',
    });
  }, [community, push, identity, key, scope]);
  return {
    notifications,
    unread: notifications.filter((n) => !n.read).length,
    markRead: () => setNotifications((old) => old.map((n) => ({ ...n, read: true }))),
  };
}
