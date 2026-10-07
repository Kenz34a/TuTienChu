import type { GameState, ItemId, Slot } from './types';
import { ITEMS, RANKS, SLOTS } from './data';

export interface GiftReward {
  stones?: number;
  immortal?: number;
  divine?: number;
  lingqi?: number;
  items?: Partial<Record<ItemId, number>>;
  gear?: { slot: Slot; rank: number; level: number };
}
export interface GiftCode {
  id: number;
  code: string;
  label: string;
  reward: GiftReward;
  minStage: number;
  maxClaims: number | null;
  claims: number;
  startsAt: number;
  expiresAt: number | null;
  enabled: boolean;
  createdAt: number;
}
export interface GiftReceipt {
  code: string;
  label: string;
  reward: GiftReward;
  time: number;
}
export function rewardText(r: GiftReward): string {
  const parts: string[] = [];
  for (const [id, label] of [
    ['stones', 'linh thạch'],
    ['immortal', 'tiên thạch'],
    ['divine', 'thần thạch'],
    ['lingqi', 'linh khí'],
  ] as const)
    if (r[id]) parts.push(`${r[id]!.toLocaleString('vi-VN')} ${label}`);
  for (const [id, amount] of Object.entries(r.items || {}))
    if (amount) parts.push(`${amount.toLocaleString('vi-VN')} ${ITEMS[id as ItemId].name}`);
  if (r.gear)
    parts.push(
      `${RANKS[r.gear.rank].name} ${SLOTS.find((s) => s.id === r.gear!.slot)!.name} +${r.gear.level}`,
    );
  return parts.join(' · ');
}
export function grantReward(s: GameState, r: GiftReward) {
  s.stones += r.stones || 0;
  s.wallet.immortal += r.immortal || 0;
  s.wallet.divine += r.divine || 0;
  s.lingqi += r.lingqi || 0;
  for (const [id, amount] of Object.entries(r.items || {})) {
    const item = id as ItemId;
    s.inventory[item] = (s.inventory[item] || 0) + amount;
  }
  if (r.gear) {
    if (s.bag.length >= 114) throw new Error('Ba lô trang bị đã đầy. Hãy dọn chỗ rồi nhận lại.');
    s.bag.push({ ...r.gear, uid: `g${s.nextUid++}` });
  }
}
