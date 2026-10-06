import { MAPS } from './data';
import type { EnemyKind, GameState, World } from './types';
import { DUNGEONS } from './expansion';

export interface Enemy {
  id: string;
  mapId: string;
  name: string;
  title: string;
  kind: EnemyKind;
  hpMultiplier: number;
  attackMultiplier: number;
  defenseMultiplier: number;
  rewardMultiplier: number;
}

const inhabitants: Record<string, [string, string, string, string]> = {
  bamboo: ['Trúc Diệp Xà', 'Linh Nha Thỏ', 'Thanh Lang Đầu Đàn', 'Trúc Yêu Cổ Thụ'],
  mountain: ['Đá Sơn Viên', 'Hỏa Vĩ Hồ', 'Xích Diễm Hổ Vương', 'Thiết Giáp Sơn Viên'],
  lake: ['Băng Lân Ngư', 'Nguyệt Ảnh Yêu', 'Hàn Giao Đầu Đàn', 'Huyền Băng Linh Quy'],
  ruins: ['Kiếm Cốt Khô Lâu', 'Tàn Hồn Vệ Binh', 'Huyết Kiếm Linh', 'Cổ Giáp Kiếm Vệ'],
  gate: ['Bạch Vũ Tiên Hạc', 'Ngọc Giáp Thiên Binh', 'Kim Mao Vân Sư', 'Thiên Môn Hộ Vệ'],
  peach: ['Hoa Linh Điệp', 'Linh Chi Tiểu Yêu', 'Vạn Niên Đào Yêu', 'Bích Diệp Tiên Xà'],
  sea: ['Vân Hải Linh Ngư', 'Thanh Phong Yêu Điểu', 'Kim Dực Bằng Vương', 'Vân Hải Long Kình'],
  palace: ['Lôi Linh Tiểu Thú', 'Thiên Cung Linh Vệ', 'Tử Điện Lôi Long', 'Lăng Tiêu Tiên Tướng'],
  stars: ['Tinh Trần Tiểu Yêu', 'Ngân Hà Linh Trùng', 'Thôn Tinh Cự Thú', 'Hắc Diệu Tinh Vệ'],
  abyss: ['Hư Không Ấu Thú', 'Thái Sơ Ma Ảnh', 'Hư Không Ma Tướng', 'Thái Sơ Cổ Ma'],
  throne: ['Thần Điện Thạch Linh', 'Kim Giáp Thần Vệ', 'Cổ Thần Chiến Tướng', 'Vạn Thần Hộ Pháp'],
  chaos: ['Hỗn Độn Linh Trùng', 'Hồng Mông Ấu Yêu', 'Hỗn Độn Tổ Yêu Phân Thân', 'Hồng Mông Cổ Thú'],
};

export const ENEMIES: Enemy[] = MAPS.flatMap((map) => {
  const names = [
    map.enemy,
    ...(inhabitants[map.id] || [
      `${map.enemy} Con`,
      `${map.enemy} Linh Ảnh`,
      `${map.enemy} Đầu Đàn`,
      `${map.enemy} Cổ Thú`,
    ]),
    `${map.enemy} Ấu Thú`,
    `${map.enemy} Dạ Hành`,
    `${map.enemy} Hộ Vệ`,
  ];
  return names.map((name, i) => ({
    id: `${map.id}-${i}`,
    mapId: map.id,
    name,
    title: map.enemyTitle,
    kind: [0, 1, 2, 5, 6].includes(i) ? 'normal' : 'elite',
    hpMultiplier: [0, 1, 2, 5, 6].includes(i) ? 1 : 1.65,
    attackMultiplier: [0, 1, 2, 5, 6].includes(i) ? 1 : 1.3,
    defenseMultiplier: [0, 1, 2, 5, 6].includes(i) ? 1 : 1.4,
    rewardMultiplier: [0, 1, 2, 5, 6].includes(i) ? 1 : 2.2,
  }));
});

export interface SecretArea {
  id: string;
  world: World;
  mapId: string;
  name: string;
  minStage: number;
  visitsNeeded: number;
  hint: string;
  lore: string;
  boss: Enemy;
}
export const SECRET_AREAS: SecretArea[] = [
  {
    id: 'earth-secret',
    world: 'earth',
    mapId: 'bamboo',
    name: 'Vô Danh Cổ Động',
    minStage: 6,
    visitsNeeded: 5,
    hint: 'Tiếng chuông dưới lòng đất chỉ vọng lại với người đã đi qua sơn hà nhiều lần.',
    lore: 'Sau màn dây leo là một cổ động chưa từng được ghi trên bản đồ. Ngọc ấn đánh thức kẻ canh giữ ngủ quên.',
    boss: {
      id: 'boss-earth',
      mapId: 'bamboo',
      name: 'U Minh Lang Vương',
      title: 'Thái cổ yêu vương',
      kind: 'boss',
      hpMultiplier: 2.6,
      attackMultiplier: 1.45,
      defenseMultiplier: 1.8,
      rewardMultiplier: 6,
    },
  },
  {
    id: 'immortal-secret',
    world: 'immortal',
    mapId: 'gate',
    name: 'Đào Nguyên Cấm Cảnh',
    minStage: 33,
    visitsNeeded: 5,
    hint: 'Có một đóa đào hoa không có bóng. Tìm dấu tích ấy qua những lần xuất hành tại Tiên Giới.',
    lore: 'Cánh đào mở lối sang một tiên cảnh bị phong ấn. Không có gió, chỉ có hơi thở của một cổ long.',
    boss: {
      id: 'boss-immortal',
      mapId: 'gate',
      name: 'Cửu U Tiên Long',
      title: 'Thái cổ yêu tiên',
      kind: 'boss',
      hpMultiplier: 2.6,
      attackMultiplier: 1.45,
      defenseMultiplier: 1.8,
      rewardMultiplier: 6,
    },
  },
  {
    id: 'divine-secret',
    world: 'divine',
    mapId: 'stars',
    name: 'Táng Thần Mật Vực',
    minStage: 51,
    visitsNeeded: 5,
    hint: 'Một vì sao chưa từng tỏa sáng. Người từng khám phá Thần Giới sẽ nghe tiếng gọi từ đó.',
    lore: 'Cổ ngọc hóa thành một lối vào giữa tinh hà. Phía sau là nơi chôn cất vị thần đã nuốt cả thời gian.',
    boss: {
      id: 'boss-divine',
      mapId: 'stars',
      name: 'Thôn Thiên Cổ Thần',
      title: 'Nguyên sơ yêu thần',
      kind: 'boss',
      hpMultiplier: 2.6,
      attackMultiplier: 1.45,
      defenseMultiplier: 1.8,
      rewardMultiplier: 6,
    },
  },
];
export const DUNGEON_ENEMIES: Enemy[] = DUNGEONS.flatMap((d) =>
  d.names.map((name, wave) => ({
    id: `dungeon-${d.id}-${wave}`,
    mapId: d.mapId,
    name,
    title: wave === 2 ? 'Trấn thủ phó bản' : 'Hộ vệ phó bản',
    kind: 'dungeon' as const,
    hpMultiplier: [1, 1.5, 2.2][wave],
    attackMultiplier: [1, 1.2, 1.35][wave],
    defenseMultiplier: [1, 1.2, 1.5][wave],
    rewardMultiplier: [0.5, 0.75, 2][wave],
  })),
);
export const ALL_ENEMIES = [
  ...ENEMIES,
  ...SECRET_AREAS.map((area) => area.boss),
  ...DUNGEON_ENEMIES,
];
export const KIND_LABELS: Record<EnemyKind, string> = {
  normal: 'Quái thường',
  elite: 'Tinh anh',
  boss: 'Boss ẩn',
  dungeon: 'Phó bản',
};
export const worldVisits = (s: GameState, world: World) =>
  MAPS.filter((m) => m.world === world).reduce(
    (total, map) => total + (s.encounters.visits[map.id] || 0),
    0,
  );
export const enemyForMap = (mapId: string, roll: number): Enemy => {
  const enemies = ENEMIES.filter((enemy) => enemy.mapId === mapId);
  // Conditional on entering combat: 80% normal, 20% elite, equal odds within each group.
  const group = enemies.filter((e) => e.kind === (roll < 0.8 ? 'normal' : 'elite'));
  const fraction = roll < 0.8 ? roll / 0.8 : (roll - 0.8) / 0.2;
  return group[Math.min(group.length - 1, Math.floor(fraction * group.length))];
};
