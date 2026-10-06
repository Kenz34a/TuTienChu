import { stoneCost, xpNeeded } from './data';
import { breakthroughTier, qiCost, tierLabel } from './expansion';
import type { BreakthroughMethod, GameState } from './types';

export const BREAKTHROUGH_PATHS = [
  {
    id: 'meditation',
    name: 'Tĩnh tâm ngưng tụ',
    description: 'Dùng tu vi, linh khí và thạch theo yêu cầu cơ bản.',
  },
  {
    id: 'pill',
    name: 'Đan dược hộ đạo',
    description: 'Dùng thêm 1 Tụ Linh Đan, giảm 20% linh khí cần thiết.',
  },
  {
    id: 'array',
    name: 'Linh trận trợ lực',
    description: 'Dùng thêm 1 tinh hoa, giảm 20% linh thạch cần thiết.',
  },
] as const;

export function breakthroughRequirements(s: GameState, method: BreakthroughMethod = 'meditation') {
  const tier = breakthroughTier(s.stage);
  const resources = [
    { id: 'xp', label: 'Tu vi', have: s.xp, need: xpNeeded(s.stage) },
    {
      id: 'qi',
      label: 'Linh khí',
      have: s.lingqi,
      need: Math.ceil(qiCost(s.stage) * (method === 'pill' ? 0.8 : 1)),
    },
    {
      id: 'stones',
      label: 'Linh thạch',
      have: s.stones,
      need: Math.ceil(stoneCost(s.stage) * (method === 'array' ? 0.8 : 1)),
    },
    ...(method === 'pill'
      ? [{ id: 'elixir', label: 'Tụ Linh Đan', have: s.inventory.elixir || 0, need: 1 }]
      : []),
    ...(method === 'array'
      ? [{ id: 'essence', label: 'Tinh hoa', have: s.inventory.essence || 0, need: 1 }]
      : []),
    ...(tier
      ? [
          {
            id: tier.kind,
            label: tierLabel(tier.kind),
            have: s.wallet[tier.kind],
            need: tier.amount,
          },
        ]
      : []),
  ].map((r) => ({ ...r, missing: Math.max(0, Math.ceil(r.need - r.have)) }));
  const maxed = s.stage >= 59;
  const missing = resources.filter((r) => r.missing > 0);
  return {
    resources,
    maxed,
    ready: !maxed && !missing.length,
    message: maxed
      ? 'Bạn đã đạt Thần Đế Đỉnh phong, cảnh giới tối thượng.'
      : missing.length
        ? `Còn thiếu ${missing.map((r) => `${r.missing.toLocaleString('vi-VN')} ${r.label.toLowerCase()}`).join(', ')}. Ngồi thiền để tích lũy tu vi và linh khí; khám phá, trừ yêu hoặc nhận thưởng nhiệm vụ để kiếm thạch.`
        : 'Đã đủ tài nguyên. Có thể đột phá!',
  };
}
