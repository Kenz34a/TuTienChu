import { ADVENTURE_MANUALS, ADVENTURE_DUNGEONS, ADVENTURE_INHERITANCES } from './ascension';
import { PHASE_COUNT, MAX_STAGE, IMMORTAL_STAGE, DIVINE_STAGE, stagePower } from './stages';
import type { GameState, World } from './types';
import type { MapData, Quest } from './data';

const places: [string, string, World, number, MapData['terrain'], string, string][] = [
  ['village', 'Lạc Hà Thôn', 'earth', 0, 'forest', 'Hắc Nha', 'Làng nhỏ bên dòng linh tuyền'],
  ['marsh', 'Vạn Độc Trạch', 'earth', 8, 'lake', 'Độc Lân Mãng', 'Sương độc che dấu cổ dược'],
  [
    'desert',
    'Xích Sa Hoang Mạc',
    'earth',
    16,
    'mountain',
    'Sa Hạt Vương',
    'Cát đỏ vùi lấp một vương triều',
  ],
  [
    'volcano',
    'Địa Hỏa Uyên',
    'earth',
    28,
    'mountain',
    'Dung Nham Cự Tích',
    'Lửa địa tâm rèn đạo cốt',
  ],
  [
    'valley',
    'Tịch Phong Cốc',
    'earth',
    32,
    'forest',
    'Phong Ảnh Báo',
    'Gió hát khúc ly biệt của phàm trần',
  ],
  [
    'cloudport',
    'Vân Hải Tiên Cảng',
    'immortal',
    36,
    'lake',
    'Vân Vụ Linh Ngư',
    'Thuyền tiên neo giữa trời cao',
  ],
  [
    'moon',
    'Quảng Hàn Cung',
    'immortal',
    44,
    'temple',
    'Nguyệt Linh Hồ',
    'Ngọc thềm đọng ánh trăng ngàn năm',
  ],
  [
    'thunder',
    'Lôi Trì Tiên Vực',
    'immortal',
    52,
    'lake',
    'Lôi Văn Kỳ Lân',
    'Thiên lôi hóa thành linh tuyền',
  ],
  [
    'sunforge',
    'Thái Dương Tiên Lô',
    'immortal',
    56,
    'mountain',
    'Kim Ô Hỏa Linh',
    'Hỏa diễm nung chảy tiên kim',
  ],
  [
    'timeless',
    'Vô Lượng Tiên Sơn',
    'immortal',
    60,
    'mountain',
    'Tuế Nguyệt Linh Thú',
    'Một ngày trên núi, ngàn năm nhân gian',
  ],
  [
    'nebula',
    'Tinh Vân Cổ Lộ',
    'divine',
    64,
    'forest',
    'Tinh Vân Thạch Yêu',
    'Tinh tú soi đường đến thần quốc',
  ],
  [
    'dragonpool',
    'Tổ Long Thần Trì',
    'divine',
    68,
    'lake',
    'Thần Lân Giao',
    'Long huyết còn vang trong nước',
  ],
  [
    'memory',
    'Luân Hồi Thần Đài',
    'divine',
    72,
    'temple',
    'Luân Hồi Hồn Vệ',
    'Ký ức vạn kiếp tụ thành đạo',
  ],
  [
    'voidsea',
    'Vô Tận Hư Hải',
    'divine',
    76,
    'lake',
    'Hư Hải Ma Kình',
    'Đại dương không có bờ hay đáy',
  ],
  [
    'origin',
    'Thái Sơ Đạo Nguyên',
    'divine',
    79,
    'temple',
    'Đạo Nguyên Cổ Linh',
    'Nơi thiên đạo viết chương đầu tiên',
  ],
];
export const EXTRA_MAPS: MapData[] = places.map(
  ([id, name, world, minStage, terrain, enemy, subtitle]) => ({
    id,
    name,
    world,
    minStage,
    terrain,
    enemy,
    subtitle,
    enemyTitle:
      world === 'earth'
        ? minStage < 8
          ? 'Yêu thú'
          : minStage < 24
            ? 'Yêu vương'
            : 'Yêu hoàng'
        : world === 'immortal'
          ? 'Yêu tiên vương'
          : 'Yêu thần vương',
    difficulty: minStage === 0 ? 'Bình yên' : 'Thử thách',
    lore: `${subtitle}. Một bia cổ kể về người tu hành từng đi qua ${name}; dấu tích của họ vẫn còn giữa linh khí.`,
  }),
);

export const EXTRA_SECTS = [
  {
    id: 'fire',
    name: 'Xích Diễm Môn',
    symbol: '炎',
    motto: 'Lửa tôi đạo cốt',
    bonus: 'Công kích +10%, sinh lực +10%',
    description: 'Võ tu luyện thể giữa địa hỏa.',
    attack: 0.1,
    health: 0.1,
  },
  {
    id: 'moonsect',
    name: 'Quảng Hàn Tiên Tông',
    symbol: '月',
    motto: 'Tĩnh nguyệt chiếu tâm',
    bonus: 'Phòng thủ +20%',
    description: 'Ngọc nữ và kiếm khách giữ thanh tâm.',
    defense: 0.2,
  },
  {
    id: 'beast',
    name: 'Ngự Thú Sơn',
    symbol: '兽',
    motto: 'Vạn thú đồng tâm',
    bonus: 'Sinh lực +15%, phòng thủ +10%',
    description: 'Người và linh thú cùng giữ sơn hà.',
    health: 0.15,
    defense: 0.1,
  },
  {
    id: 'starsect',
    name: 'Tinh Hà Đạo Viện',
    symbol: '星',
    motto: 'Tinh tú dẫn tiên lộ',
    bonus: 'Tu luyện +15%, công kích +5%',
    description: 'Chiêm tinh và nghiên cứu cổ đạo.',
    cultivation: 0.15,
    attack: 0.05,
  },
  {
    id: 'voidsect',
    name: 'Hư Không Điện',
    symbol: '空',
    motto: 'Một niệm vượt hư không',
    bonus: 'Công kích +10%, phòng thủ +10%',
    description: 'Ẩn sĩ tinh thông trận pháp không gian.',
    attack: 0.1,
    defense: 0.1,
  },
  {
    id: 'medicine',
    name: 'Dược Vương Cốc',
    symbol: '药',
    motto: 'Một đan cứu vạn linh',
    bonus: 'Sinh lực +25%',
    description: 'Y tu kế thừa vạn năm đan đạo.',
    health: 0.25,
  },
];
const npcNames = [
  'Hạ Linh Nhi',
  'Độc Cô Dược',
  'Sa Vô Ngân',
  'Viêm Tử Mặc',
  'Phong Thiên Hành',
  'Bạch Vân Tử',
  'Hàn Nguyệt',
  'Lôi Chấn Tiên',
  'Kim Dương',
  'Tuế Nguyệt Ông',
  'Tinh Ly',
  'Long Huyền',
  'Luân Hồi Sứ',
  'Hải Vô Nhai',
  'Thái Sơ Đạo Nhân',
];
export const EXTRA_NPCS = EXTRA_MAPS.map((map, i) => ({
  id: `npc-${map.id}`,
  name: npcNames[i],
  role: ['Người giữ cổ thư', 'Luyện đan sư', 'Trận pháp sư'][i % 3],
  symbol: ['书', '丹', '阵'][i % 3],
  mapId: map.id,
  minStage: map.minStage,
  dialogue: `“${map.subtitle}. Đạo hữu hãy thử ngồi thiền, tham ngộ bí kíp rồi vượt phó bản của giới này. Thiên đạo trọng người kiên trì.”`,
  gift: i % 2 ? ('ore' as const) : ('herb' as const),
  reward: i % 3 === 0 ? ('pill' as const) : ('essence' as const),
}));

export type ManualAttribute = 'attack' | 'defense' | 'health' | 'cultivation';
export const MANUALS: {
  id: string;
  name: string;
  symbol: string;
  world: World;
  minStage: number;
  attribute: ManualAttribute;
  bonus: number;
  description: string;
}[] = [
  {
    id: 'breath',
    name: 'Dẫn Khí Quyết',
    symbol: '气',
    world: 'earth',
    minStage: 0,
    attribute: 'cultivation',
    bonus: 0.05,
    description: 'Điều tức để hấp thu linh khí.',
  },
  {
    id: 'iron',
    name: 'Thiết Cốt Công',
    symbol: '骨',
    world: 'earth',
    minStage: 0,
    attribute: 'health',
    bonus: 0.04,
    description: 'Rèn gân cốt, củng cố thân thể.',
  },
  {
    id: 'windblade',
    name: 'Phong Nhận Kiếm Pháp',
    symbol: '剑',
    world: 'earth',
    minStage: 4,
    attribute: 'attack',
    bonus: 0.04,
    description: 'Kiếm ý nhanh như gió.',
  },
  {
    id: 'jade',
    name: 'Ngọc Thanh Hộ Thể',
    symbol: '玉',
    world: 'earth',
    minStage: 12,
    attribute: 'defense',
    bonus: 0.05,
    description: 'Ngọc khí kết thành linh giáp.',
  },
  {
    id: 'flames',
    name: 'Cửu Chuyển Hỏa Công',
    symbol: '炎',
    world: 'earth',
    minStage: 24,
    attribute: 'attack',
    bonus: 0.05,
    description: 'Cửu hỏa hợp nhất thành chân khí.',
  },
  {
    id: 'cloudstep',
    name: 'Lưu Vân Tiên Kinh',
    symbol: '云',
    world: 'immortal',
    minStage: 36,
    attribute: 'cultivation',
    bonus: 0.07,
    description: 'Vân khí nuôi dưỡng tiên cơ.',
  },
  {
    id: 'moonshield',
    name: 'Quảng Hàn Tiên Giáp',
    symbol: '月',
    world: 'immortal',
    minStage: 40,
    attribute: 'defense',
    bonus: 0.06,
    description: 'Ánh trăng hóa hộ thể tiên quang.',
  },
  {
    id: 'lightning',
    name: 'Ngũ Lôi Chính Pháp',
    symbol: '雷',
    world: 'immortal',
    minStage: 44,
    attribute: 'attack',
    bonus: 0.06,
    description: 'Ngũ lôi rèn công kích.',
  },
  {
    id: 'immortalbody',
    name: 'Bất Diệt Tiên Thể',
    symbol: '仙',
    world: 'immortal',
    minStage: 52,
    attribute: 'health',
    bonus: 0.06,
    description: 'Tiên nguyên kết thành bất diệt thân.',
  },
  {
    id: 'time',
    name: 'Tuế Nguyệt Đạo Kinh',
    symbol: '时',
    world: 'immortal',
    minStage: 60,
    attribute: 'cultivation',
    bonus: 0.08,
    description: 'Tham ngộ dòng chảy của thời gian.',
  },
  {
    id: 'starscript',
    name: 'Tinh Hà Thần Điển',
    symbol: '星',
    world: 'divine',
    minStage: 64,
    attribute: 'cultivation',
    bonus: 0.1,
    description: 'Tinh tú bồi dưỡng thần nguyên.',
  },
  {
    id: 'dragonbody',
    name: 'Tổ Long Thần Thể',
    symbol: '龙',
    world: 'divine',
    minStage: 68,
    attribute: 'health',
    bonus: 0.08,
    description: 'Tổ long truyền lại bất diệt đạo cốt.',
  },
  {
    id: 'reincarnation',
    name: 'Luân Hồi Hộ Đạo',
    symbol: '轮',
    world: 'divine',
    minStage: 72,
    attribute: 'defense',
    bonus: 0.08,
    description: 'Vạn kiếp bảo vệ thần hồn.',
  },
  {
    id: 'voidblade',
    name: 'Hư Không Trảm',
    symbol: '空',
    world: 'divine',
    minStage: 76,
    attribute: 'attack',
    bonus: 0.08,
    description: 'Kiếm ý xé khoảng không.',
  },
  {
    id: 'originbook',
    name: 'Hồng Mông Đạo Thư',
    symbol: '道',
    world: 'divine',
    minStage: 79,
    attribute: 'cultivation',
    bonus: 0.12,
    description: 'Tham ngộ nguồn gốc vạn vật.',
  },
];
MANUALS.push(...ADVENTURE_MANUALS);
export const MANUAL_LABELS: Record<ManualAttribute, string> = {
  attack: 'công kích',
  defense: 'phòng thủ',
  health: 'sinh lực',
  cultivation: 'tu luyện',
};
export const qiCost = (stage: number) => 20 + stagePower(stage) * 8;
export const tierCost = (
  stage: number,
  amount = 1,
): { kind: 'immortal' | 'divine'; amount: number } | null =>
  stage >= DIVINE_STAGE
    ? { kind: 'divine', amount }
    : stage >= IMMORTAL_STAGE
      ? { kind: 'immortal', amount }
      : null;
export const tierLabel = (kind: 'immortal' | 'divine') =>
  kind === 'immortal' ? 'tiên thạch' : 'thần thạch';
export const breakthroughTier = (stage: number) =>
  tierCost(
    stage,
    3 + Math.floor((stage - (stage >= DIVINE_STAGE ? DIVINE_STAGE : IMMORTAL_STAGE)) / PHASE_COUNT),
  );
export const canPayBreakthroughTier = (s: GameState) => {
  const cost = breakthroughTier(s.stage);
  return !cost || s.wallet[cost.kind] >= cost.amount;
};
export const currencyReward = (s: GameState, stage: number, multiplier = 1) => {
  const cost = tierCost(
    stage,
    Math.max(
      1,
      Math.floor(
        multiplier *
          (1 +
            (stage - (stage >= DIVINE_STAGE ? DIVINE_STAGE : IMMORTAL_STAGE)) / (2 * PHASE_COUNT)),
      ),
    ),
  );
  if (cost) s.wallet[cost.kind] = Math.min(1e9, s.wallet[cost.kind] + cost.amount);
  return cost;
};
export const studyCost = (level: number, stage: number) => ({
  stones: (level + 1) * (50 + stagePower(stage) * 12),
  qi: (level + 1) * (12 + stagePower(stage) * 3),
});
export const sectBuildCost = (level: number) => ({
  stones: 250 * (level + 1),
  ore: 5 * (level + 1),
});
export const dungeonClears = (s: GameState) =>
  Object.values(s.dungeons.clears).reduce((sum, n) => sum + n, 0);

export const DUNGEONS: {
  id: string;
  name: string;
  world: World;
  mapId: string;
  minStage: number;
  names: [string, string, string];
  lore: string;
}[] = [
  {
    id: 'trial',
    name: 'Thanh Vân Thí Luyện',
    world: 'earth',
    mapId: 'bamboo',
    minStage: 0,
    names: ['Mộc Linh Khôi Lỗi', 'Thiết Giáp Khôi Lỗi', 'Thủ Sơn Linh Tướng'],
    lore: 'Ba cửa thử đạo tâm của người mới nhập đạo.',
  },
  {
    id: 'crypt',
    name: 'U Minh Địa Cung',
    world: 'earth',
    mapId: 'lake',
    minStage: 12,
    names: ['U Hồn', 'Bạch Cốt Yêu Tướng', 'U Minh Điện Chủ'],
    lore: 'Linh đèn dẫn đường qua địa cung bị lãng quên.',
  },
  {
    id: 'swordtrial',
    name: 'Vạn Kiếm Cổ Trận',
    world: 'earth',
    mapId: 'ruins',
    minStage: 24,
    names: ['Kiếm Hồn', 'Cổ Kiếm Vệ', 'Vạn Kiếm Trận Linh'],
    lore: 'Kiếm ý ngàn năm chọn người kế thừa.',
  },
  {
    id: 'cloudtrial',
    name: 'Thiên Môn Tiên Tháp',
    world: 'immortal',
    mapId: 'gate',
    minStage: 36,
    names: ['Thiên Môn Linh Binh', 'Tiên Giáp Vệ', 'Tiên Tháp Trấn Thủ'],
    lore: 'Vượt ba tầng tiên tháp để nhận tiên duyên.',
  },
  {
    id: 'moontrial',
    name: 'Quảng Hàn Mật Cung',
    world: 'immortal',
    mapId: 'moon',
    minStage: 44,
    names: ['Nguyệt Ảnh', 'Hàn Ngọc Linh Vệ', 'Quảng Hàn Cổ Linh'],
    lore: 'Dưới trăng lạnh, tiên nguyên bừng sáng.',
  },
  {
    id: 'suntrial',
    name: 'Kim Ô Tiên Lô',
    world: 'immortal',
    mapId: 'sunforge',
    minStage: 56,
    names: ['Hỏa Linh', 'Kim Ô Hộ Vệ', 'Thái Dương Lô Chủ'],
    lore: 'Lửa chân tiên thử thách bất diệt đạo cốt.',
  },
  {
    id: 'startrial',
    name: 'Tinh Hà Thần Tháp',
    world: 'divine',
    mapId: 'stars',
    minStage: 64,
    names: ['Tinh Trần Thạch Linh', 'Tinh Hà Chiến Vệ', 'Tinh Tháp Cổ Thần'],
    lore: 'Ba tinh môn mở lối đến thần nguyên.',
  },
  {
    id: 'memorytrial',
    name: 'Luân Hồi Thần Vực',
    world: 'divine',
    mapId: 'memory',
    minStage: 72,
    names: ['Vong Kiếp Hồn', 'Luân Hồi Vệ', 'Chấp Chưởng Luân Hồi'],
    lore: 'Đi qua ký ức ba đời để bảo vệ thần tâm.',
  },
  {
    id: 'origintrial',
    name: 'Hồng Mông Thí Luyện',
    world: 'divine',
    mapId: 'chaos',
    minStage: 76,
    names: ['Hỗn Độn Hồn', 'Hồng Mông Thần Vệ', 'Thái Sơ Đạo Chủ'],
    lore: 'Thử thách cuối cùng trước nguồn gốc thiên đạo.',
  },
];
DUNGEONS.push(...ADVENTURE_DUNGEONS);
export const WORLD_BOSSES = [
  {
    id: 'world-earth',
    name: 'Huyết Nguyệt Yêu Hoàng',
    world: 'earth' as World,
    minStage: 0,
    stage: 8,
    offset: 0,
    symbol: '狼',
  },
  {
    id: 'world-immortal',
    name: 'Thôn Nhật Kim Ô',
    world: 'immortal' as World,
    minStage: 36,
    stage: 44,
    offset: 20 * 60000,
    symbol: '日',
  },
  {
    id: 'world-divine',
    name: 'Hỗn Độn Ma Thần',
    world: 'divine' as World,
    minStage: 64,
    stage: 68,
    offset: 40 * 60000,
    symbol: '神',
  },
];
export const bossCycle = (now: number, offset: number) =>
  Math.floor((now - offset) / 3600000) * 3600000 + offset;

export const SPIRITUAL_ROOTS = [
  {
    id: 'metal',
    name: 'Kim linh căn',
    symbol: '金',
    color: '#bca26a',
    rarity: 'Ngũ hành',
    attribute: 'attack' as ManualAttribute,
    bonus: 0.015,
    lore: 'Sắc bén như kiếm, hợp con đường kiếm tu.',
  },
  {
    id: 'wood',
    name: 'Mộc linh căn',
    symbol: '木',
    color: '#729573',
    rarity: 'Ngũ hành',
    attribute: 'health' as ManualAttribute,
    bonus: 0.025,
    lore: 'Sinh cơ bền bỉ, hợp luyện đan và dưỡng sinh.',
  },
  {
    id: 'water',
    name: 'Thủy linh căn',
    symbol: '水',
    color: '#759caf',
    rarity: 'Ngũ hành',
    attribute: 'cultivation' as ManualAttribute,
    bonus: 0.02,
    lore: 'Nhu hòa như nước, dẫn linh khí vào kinh mạch.',
  },
  {
    id: 'fire',
    name: 'Hỏa linh căn',
    symbol: '火',
    color: '#bd7860',
    rarity: 'Ngũ hành',
    attribute: 'attack' as ManualAttribute,
    bonus: 0.02,
    lore: 'Chân hỏa rèn thân, công kích mãnh liệt.',
  },
  {
    id: 'earth',
    name: 'Thổ linh căn',
    symbol: '土',
    color: '#a58b68',
    rarity: 'Ngũ hành',
    attribute: 'defense' as ManualAttribute,
    bonus: 0.025,
    lore: 'Vững như sơn nhạc, linh giáp hộ thân.',
  },
  {
    id: 'ice',
    name: 'Băng linh căn',
    symbol: '冰',
    color: '#84b6c0',
    rarity: 'Dị linh căn',
    attribute: 'defense' as ManualAttribute,
    bonus: 0.03,
    lore: 'Băng tâm thanh tịnh, bồi dưỡng hộ thể.',
  },
  {
    id: 'wind',
    name: 'Phong linh căn',
    symbol: '风',
    color: '#93b9a0',
    rarity: 'Dị linh căn',
    attribute: 'cultivation' as ManualAttribute,
    bonus: 0.03,
    lore: 'Theo gió hấp thu linh khí thiên địa.',
  },
  {
    id: 'thunder',
    name: 'Lôi linh căn',
    symbol: '雷',
    color: '#9b85bc',
    rarity: 'Dị linh căn',
    attribute: 'attack' as ManualAttribute,
    bonus: 0.03,
    lore: 'Lôi đình ẩn trong kinh mạch, lấy chiến rèn đạo.',
  },
  {
    id: 'heaven',
    name: 'Thiên linh căn',
    symbol: '天',
    color: '#d2b979',
    rarity: 'Thiên phẩm',
    attribute: 'cultivation' as ManualAttribute,
    bonus: 0.04,
    lore: 'Thiên địa cùng cộng hưởng, đạo lộ rộng mở.',
  },
  {
    id: 'chaos',
    name: 'Hỗn Độn linh căn',
    symbol: '混',
    color: '#b793b1',
    rarity: 'Thần phẩm',
    attribute: 'cultivation' as ManualAttribute,
    bonus: 0.05,
    lore: 'Chỉ thức tỉnh sau truyền thừa Thái Sơ; vạn pháp quy nhất.',
  },
];
export const rootCost = (level: number) => ({ qi: 20 * level, stones: 60 * level, essence: level });
export const rootForRoll = (roll: number) =>
  roll < 0.85
    ? SPIRITUAL_ROOTS[Math.min(4, Math.floor((roll / 0.85) * 5))]
    : roll < 0.99
      ? SPIRITUAL_ROOTS[5 + Math.min(2, Math.floor(((roll - 0.85) / 0.14) * 3))]
      : SPIRITUAL_ROOTS[8];
export interface Inheritance {
  id: string;
  name: string;
  world: World;
  minStage: number;
  symbol: string;
  qi: number;
  attribute: ManualAttribute;
  bonus: number;
  manual: string;
  hint: string;
  requirement: string;
  lore: string;
  reveal: (s: GameState) => boolean;
  ready: (s: GameState) => boolean;
  progress?: (s: GameState) => number;
  target?: number;
}
export const INHERITANCES: Inheritance[] = [
  {
    id: 'cloud-legacy',
    name: 'Thanh Vân Đạo Thống',
    world: 'earth',
    minStage: 0,
    symbol: '云',
    qi: 60,
    attribute: 'cultivation',
    bonus: 0.05,
    manual: 'breath',
    hint: 'Người dẫn đạo giữa rừng trúc biết một cổ động.',
    requirement: 'Gặp Vân Hạc · Ngồi thiền 15 phút · Dẫn Khí Quyết tầng 3',
    lore: 'Một tia thần niệm của khai tổ truyền lại phương pháp dẫn khí.',
    reveal: (s) => s.npcMet.includes('elder'),
    ready: (s) => s.training.totalSeconds >= 900 && (s.manuals.breath || 0) >= 3,
  },
  {
    id: 'sword-legacy',
    name: 'Kiếm Tôn Di Chí',
    world: 'earth',
    minStage: 4,
    symbol: '剑',
    qi: 90,
    attribute: 'attack',
    bonus: 0.06,
    manual: 'windblade',
    hint: 'Kiếm khách Vân Vụ Sơn đang giữ di vật.',
    requirement: 'Gặp Mặc Vô Trần · Vượt Thanh Vân Thí Luyện · Học Phong Nhận Kiếm Pháp',
    lore: 'Một thanh cổ kiếm ghi lại kiếm ý của người từng bảo vệ phàm trần.',
    reveal: (s) => s.npcMet.includes('swordsman'),
    ready: (s) => (s.dungeons.clears.trial || 0) > 0 && (s.manuals.windblade || 0) > 0,
  },
  {
    id: 'medicine-legacy',
    name: 'Đan Tâm Cổ Quyển',
    world: 'earth',
    minStage: 4,
    symbol: '丹',
    qi: 75,
    attribute: 'health',
    bonus: 0.06,
    manual: 'iron',
    hint: 'Hạ Linh Nhi tại Lạc Hà Thôn giữ một tàn quyển.',
    requirement: 'Gặp Hạ Linh Nhi · Luyện chế 5 lần · Học Thiết Cốt Công',
    lore: 'Cổ đan sư để lại bí pháp dưỡng sinh và rèn đạo cốt.',
    reveal: (s) => s.npcMet.includes('npc-village'),
    ready: (s) => s.metrics.crafts >= 5 && (s.manuals.iron || 0) > 0,
  },
  {
    id: 'cloud-immortal',
    name: 'Thiên Môn Tiên Truyền',
    world: 'immortal',
    minStage: 36,
    symbol: '仙',
    qi: 400,
    attribute: 'cultivation',
    bonus: 0.07,
    manual: 'cloudstep',
    hint: 'Người giữ tiên môn biết lối đến tiên tháp.',
    requirement: 'Gặp Nguyệt Dao · Vượt Thiên Môn Tiên Tháp · Học Lưu Vân Tiên Kinh',
    lore: 'Tiên môn trao một đạo tiên nguyên cho người đã giữ vững phàm tâm.',
    reveal: (s) => s.npcMet.includes('fairy'),
    ready: (s) => (s.dungeons.clears.cloudtrial || 0) > 0 && (s.manuals.cloudstep || 0) > 0,
  },
  {
    id: 'moon-legacy',
    name: 'Quảng Hàn Nguyệt Ấn',
    world: 'immortal',
    minStage: 44,
    symbol: '月',
    qi: 550,
    attribute: 'defense',
    bonus: 0.08,
    manual: 'moonshield',
    hint: 'Hàn Nguyệt trong Quảng Hàn Cung chờ người hữu duyên.',
    requirement: 'Gặp Hàn Nguyệt · Vượt Quảng Hàn Mật Cung · Học Quảng Hàn Tiên Giáp',
    lore: 'Vầng trăng ngàn năm hóa ấn hộ đạo.',
    reveal: (s) => s.npcMet.includes('npc-moon'),
    ready: (s) => (s.dungeons.clears.moontrial || 0) > 0 && (s.manuals.moonshield || 0) > 0,
  },
  {
    id: 'dragon-legacy',
    name: 'Cửu U Long Ấn',
    world: 'immortal',
    minStage: 44,
    symbol: '龙',
    qi: 650,
    attribute: 'attack',
    bonus: 0.08,
    manual: 'lightning',
    hint: 'Một cổ long đang ngủ trong bí cảnh đào hoa.',
    requirement: 'Đánh bại Cửu U Tiên Long · Học Ngũ Lôi Chính Pháp',
    lore: 'Long ấn trao sức mạnh lôi đình cho kẻ vượt được cổ long.',
    reveal: (s) => s.encounters.discoveredSecrets.includes('immortal-secret'),
    ready: (s) =>
      s.encounters.defeatedBosses.includes('boss-immortal') && (s.manuals.lightning || 0) > 0,
  },
  {
    id: 'star-legacy',
    name: 'Tinh Hà Thần Tàng',
    world: 'divine',
    minStage: 64,
    symbol: '星',
    qi: 1200,
    attribute: 'cultivation',
    bonus: 0.1,
    manual: 'starscript',
    hint: 'Thái Huyền Cổ Thần nhớ câu chuyện trước khi sao hình thành.',
    requirement: 'Gặp Cổ Thần · Vượt Tinh Hà Thần Tháp · Học Tinh Hà Thần Điển',
    lore: 'Thần tàng mở ra một góc tinh hà trong thần hồn.',
    reveal: (s) => s.npcMet.includes('god'),
    ready: (s) => (s.dungeons.clears.startrial || 0) > 0 && (s.manuals.starscript || 0) > 0,
  },
  {
    id: 'reincarnation-legacy',
    name: 'Luân Hồi Đạo Ấn',
    world: 'divine',
    minStage: 72,
    symbol: '轮',
    qi: 1600,
    attribute: 'health',
    bonus: 0.1,
    manual: 'reincarnation',
    hint: 'Luân Hồi Sứ trên thần đài giữ ký ức vạn kiếp.',
    requirement: 'Gặp Luân Hồi Sứ · Vượt Luân Hồi Thần Vực · Học Luân Hồi Hộ Đạo',
    lore: 'Bạn tìm được lời thề từ kiếp trước, thần thể được bồi dưỡng.',
    reveal: (s) => s.npcMet.includes('npc-memory'),
    ready: (s) => (s.dungeons.clears.memorytrial || 0) > 0 && (s.manuals.reincarnation || 0) > 0,
  },
  {
    id: 'origin-legacy',
    name: 'Thái Sơ Hỗn Độn Truyền Thừa',
    world: 'divine',
    minStage: 76,
    symbol: '道',
    qi: 2500,
    attribute: 'cultivation',
    bonus: 0.12,
    manual: 'voidblade',
    hint: 'Sau bí cảnh Táng Thần là dấu tích của thời nguyên sơ.',
    requirement: 'Đánh bại Thôn Thiên Cổ Thần · Vượt Hồng Mông Thí Luyện · Đã thức tỉnh linh căn',
    lore: 'Vạn pháp quy nhất. Linh căn của bạn chuyển hóa thành Hỗn Độn linh căn, giữ nguyên tầng tẩy luyện.',
    reveal: (s) => s.encounters.discoveredSecrets.includes('divine-secret'),
    ready: (s) =>
      s.encounters.defeatedBosses.includes('boss-divine') &&
      (s.dungeons.clears.origintrial || 0) > 0 &&
      !!s.spiritualRoot,
  },
];

INHERITANCES.push(...ADVENTURE_INHERITANCES);

export const EXTRA_QUESTS: Quest[] = [
  {
    id: 'root-awakened',
    name: 'Linh căn thức tỉnh',
    description: 'Kiểm tra linh căn tại Linh căn & truyền thừa.',
    category: 'main',
    minStage: 0,
    target: 1,
    progress: (s) => (s.spiritualRoot ? 1 : 0),
    stones: 50,
    xp: 0,
    item: 'essence',
  },
  {
    id: 'first-inheritance',
    name: 'Kế thừa một đạo lộ',
    description: 'Nhận truyền thừa đầu tiên của cổ nhân.',
    category: 'main',
    minStage: 0,
    target: 1,
    progress: (s) => s.inheritances.length,
    stones: 300,
    xp: 100,
    item: 'key',
  },
  {
    id: 'hidden-origin-root',
    name: 'Vạn pháp quy nhất',
    description: 'Thức tỉnh Hỗn Độn linh căn từ truyền thừa Thái Sơ.',
    category: 'hidden',
    minStage: 76,
    target: 1,
    progress: (s) => (s.spiritualRoot?.id === 'chaos' ? 1 : 0),
    reveal: (s) => s.inheritances.length >= 3,
    stones: 10000,
    xp: 5000,
    item: 'key',
  },
  ...EXTRA_MAPS.map((map, i): Quest => ({
    id: `journey-${map.id}`,
    name: `${map.name} · Tìm dấu cổ nhân`,
    description: `Đến ${map.name} 3 lần để đọc hết câu chuyện trên cổ bia.`,
    category: 'main',
    minStage: map.minStage,
    target: 3,
    progress: (s) => s.encounters.visits[map.id] || 0,
    stones: 120 * (i + 1),
    xp: Math.round(15 * 1.18 ** stagePower(map.minStage)),
    item: 'key',
  })),
  ...DUNGEONS.map((d, i): Quest => ({
    id: `clear-${d.id}`,
    name: `Vượt ${d.name}`,
    description: 'Vượt cả ba cửa và đánh bại kẻ trấn giữ.',
    category: 'main',
    minStage: d.minStage,
    target: 1,
    progress: (s) => s.dungeons.clears[d.id] || 0,
    stones: 200 * (i + 1),
    xp: Math.round(25 * 1.18 ** stagePower(d.minStage)),
    item: 'elixir',
  })),
  ...[1, 3, 6, 10].map((n): Quest => ({
    id: `manuals-${n}`,
    name: `Tàng thư · ${n} bí kíp`,
    description: `Tham ngộ ${n} bí kíp khác nhau.`,
    category: 'main',
    minStage: n < 6 ? 0 : IMMORTAL_STAGE,
    target: n,
    progress: (s) => Object.keys(s.manuals).length,
    stones: n * 150,
    xp: n * 30,
    item: 'essence',
  })),
  ...[5, 10, 15].map((n): Quest => ({
    id: `friends-${n}`,
    name: `Tiên duyên · ${n} tri kỷ`,
    description: `Gặp gỡ ${n} NPC trong tam giới.`,
    category: 'main',
    minStage: 0,
    target: n,
    progress: (s) => s.npcMet.length,
    stones: n * 100,
    xp: n * 30,
    item: 'key',
  })),
  {
    id: 'founder',
    name: 'Khai sơn lập phái',
    description: 'Tự lập tông môn và xây đại điện lên cấp 2.',
    category: 'main',
    minStage: 4,
    target: 2,
    progress: (s) => s.customSect?.buildings.hall || 0,
    stones: 500,
    xp: 150,
    item: 'essence',
  },
  {
    id: 'hidden-library',
    name: 'Đạo thư không có tên',
    description: 'Ngồi thiền đủ 60 phút và học 3 bí kíp.',
    category: 'hidden',
    minStage: 0,
    target: 3,
    progress: (s) => Object.keys(s.manuals).length,
    reveal: (s) => s.training.totalSeconds >= 3600,
    stones: 600,
    xp: 200,
    item: 'key',
  },
  {
    id: 'hidden-tower',
    name: 'Kẻ bước qua chín cửa',
    description: 'Vượt 9 lượt phó bản.',
    category: 'hidden',
    minStage: 0,
    target: 9,
    progress: dungeonClears,
    reveal: (s) => dungeonClears(s) >= 3,
    stones: 1200,
    xp: 300,
    item: 'key',
  },
  {
    id: 'daily-long-training',
    name: 'Đạo tâm bền bỉ',
    description: 'Hoàn thành 15 phút ngồi thiền trong ngày.',
    category: 'daily',
    minStage: 0,
    target: 15,
    progress: (s) => s.daily.meditations,
    stones: 150,
    xp: 30,
    item: 'essence',
  },
];
