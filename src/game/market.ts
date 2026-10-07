import type { Gear, ItemId } from './types';
import { ITEMS, RANKS, SLOTS } from './data';
import { MATERIALS, TALISMANS } from './ascension';
export type MarketCurrency = 'spirit' | 'immortal' | 'divine';
export type MarketAsset =
  | { kind: 'item'; id: ItemId }
  | { kind: 'material'; id: string }
  | { kind: 'talisman'; id: string }
  | { kind: 'gear'; gear: Omit<Gear, 'uid'> };
export interface MarketListing {
  id: string;
  asset: MarketAsset;
  quantity: number;
  price: number;
  currency: MarketCurrency;
  sellerName: string;
  buyerName: string | null;
  createdAt: number;
  expiresAt: number;
  status: 'open' | 'sold' | 'cancelled';
  self: boolean;
  private: boolean;
  canBuy: boolean;
  fee: number;
}
export interface MarketFeed {
  listings: MarketListing[];
  total: number;
  page: number;
  serverTime: number;
}
export const MARKET_CURRENCY: Record<MarketCurrency, string> = {
  spirit: 'linh thạch',
  immortal: 'tiên thạch',
  divine: 'thần thạch',
};
export function marketName(asset: MarketAsset) {
  if (asset.kind === 'item') return ITEMS[asset.id].name;
  if (asset.kind === 'material') return MATERIALS.find((m) => m.id === asset.id)?.name || asset.id;
  if (asset.kind === 'talisman') return TALISMANS.find((m) => m.id === asset.id)?.name || asset.id;
  return `${RANKS[asset.gear.rank].name} · ${SLOTS.find((s) => s.id === asset.gear.slot)!.name} +${asset.gear.level}`;
}
