import type { GameState, World } from './types';
import type { MapData, Quest } from './data';

export type DaoAttribute = 'attack' | 'defense' | 'health' | 'cultivation';
export const DAO_LABELS: Record<DaoAttribute, string> = {
  attack: 'công kích',
  defense: 'phòng thủ',
  health: 'sinh lực',
  cultivation: 'tu luyện',
};
const regions: [string, string, World, number, MapData['terrain'], string, string][] = [
  [
    'jadeharbor',
    'Ngọc Lan Thương Cảng',
    'earth',
    0,
    'lake',
    'Ngọc Giáp Hà',
    'Thuyền chở linh dược mắc cạn; thương hội cần người mở lại tuyến đường.',
  ],
  [
    'whisperwood',
    'Mộng Điệp U Lâm',
    'earth',
    12,
    'forest',
    'Mộng Điệp Yêu',
    'Mỗi cánh bướm giữ một ký ức; người dẫn đường đã quên tên mình.',
  ],
  [
    'embercity',
    'Ly Hỏa Cổ Thành',
    'earth',
    24,
    'temple',
    'Hỏa Đồng Khôi Lỗi',
    'Lò luyện phù cuối cùng vẫn cháy giữa thành quách phủ tro.',
  ],
  [
    'cloudgarden',
    'Dao Trì Vân Viên',
    'immortal',
    36,
    'forest',
    'Dao Trì Linh Lộc',
    'Vườn tiên thất lạc mùa xuân, cần một người đánh thức linh tuyền.',
  ],
  [
    'bellisland',
    'Thiên Âm Đảo',
    'immortal',
    44,
    'lake',
    'Âm Ba Hải Yêu',
    'Chín chiếc chuông chìm dưới biển gọi những linh thú không nhà.',
  ],
  [
    'frostarchive',
    'Băng Tâm Thư Các',
    'immortal',
    56,
    'temple',
    'Băng Văn Thư Linh',
    'Đạo thư bị đóng băng; từng trang chỉ mở cho người giữ lời hứa.',
  ],
  [
    'starforge',
    'Tinh Hà Thần Phường',
    'divine',
    64,
    'mountain',
    'Tinh Hỏa Thạch Linh',
    'Thợ rèn dùng ánh sao sửa chiếc cầu nối hai thần quốc.',
  ],
  [
    'soulriver',
    'Vong Xuyên Thần Hà',
    'divine',
    72,
    'lake',
    'Dẫn Hồn Thần Ngư',
    'Người chèo đò không lấy linh thạch, chỉ đổi những câu chuyện chưa kể.',
  ],
  [
    'dawnrealm',
    'Vĩnh Dạ Bình Minh',
    'divine',
    79,
    'temple',
    'Dạ Mạc Cổ Yêu',
    'Bình minh bị phong ấn; một ngọn đèn động thiên có thể đổi vận tam giới.',
  ],
];
export const ADVENTURE_MAPS: MapData[] = regions.map(
  ([id, name, world, minStage, terrain, enemy, lore]) => ({
    id,
    name,
    world,
    minStage,
    terrain,
    enemy,
    lore,
    subtitle: lore.split(';')[0],
    enemyTitle:
      world === 'earth'
        ? 'Yêu vương'
        : world === 'immortal'
          ? 'Yêu tiên hoàng'
          : 'Thái cổ yêu thần',
    difficulty: minStage === 0 ? 'Khởi hành' : 'Cơ duyên',
  }),
);
const people: [string, string, string, string, string][] = [
  [
    'lan',
    'Lan Nhược',
    'Chủ thương hội',
    'jadeharbor',
    'Hàng hóa phải có người gửi, người nhận và một lời hứa. Giữ lại ba linh thảo để mở luống đầu tiên nhé.',
  ],
  [
    'butterfly',
    'Điệp Vô Ưu',
    'Người giữ ký ức',
    'whisperwood',
    'Ta nhớ tiếng sáo nhưng quên người thổi. Hãy đi qua khu rừng ba lần, có lẽ bướm sẽ nhớ thay ta.',
  ],
  [
    'ember',
    'Tần Ly Hỏa',
    'Phù sư thất truyền',
    'embercity',
    'Phù không phải nét mực. Nó là ý chí đã được rèn qua thất bại. Mang huyền thiết cho ta, đổi lấy tinh hoa luyện phù.',
  ],
  [
    'garden',
    'Dao Mộc Linh',
    'Người giữ linh tuyền',
    'cloudgarden',
    'Linh dược cần thời gian, như đạo tâm. Đừng hái khi trăng chưa lên; hãy thu hoạch đúng mùa.',
  ],
  [
    'bell',
    'Cửu Âm',
    'Nhạc tu du hành',
    'bellisland',
    'Linh thú nghe được điều chúng ta giấu. Cho chúng ăn, giữ lời hứa, rồi chúng sẽ đi cùng đạo hữu.',
  ],
  [
    'archive',
    'Bạch Tâm',
    'Thủ thư tiên các',
    'frostarchive',
    'Mỗi trang đạo thư là một lần vượt qua chính mình. Duy trì ba bí kíp có thể giúp đạo hữu giữ tâm giữa băng tuyết.',
  ],
  [
    'forge',
    'Tinh Chùy',
    'Thần tượng sư',
    'starforge',
    'Ta không rèn thanh kiếm mạnh nhất. Ta rèn chiếc cầu cho người yếu nhất vẫn có thể bước qua.',
  ],
  [
    'river',
    'Mạnh Thanh',
    'Người chèo đò',
    'soulriver',
    'Đạo hữu đã đi xa như thế, còn nhớ người dạy mình dẫn khí không? Truyền thừa là một món nợ ân tình.',
  ],
  [
    'dawn',
    'Chúc Bình Minh',
    'Người giữ thiên đăng',
    'dawnrealm',
    'Đừng mong một mình cứu cả tam giới. Một linh thú, một người bạn, một hạt giống: hãy bắt đầu từ đó.',
  ],
  [
    'petkeeper',
    'A Liên',
    'Ngự thú sư',
    'jadeharbor',
    'Thanh Vĩ Hồ ăn linh thảo và Hồi Xuân Đan. Nuôi đủ thân mật, nó sẽ lớn cùng đạo hữu.',
  ],
  [
    'cartographer',
    'Ôn Hành',
    'Người vẽ cổ lộ',
    'jadeharbor',
    'Viễn chinh là chuyến đi tự động theo thời gian. Trở về nhận nguyên liệu rồi mới khởi hành chuyến tiếp theo.',
  ],
  [
    'sealkeeper',
    'Tô Mặc',
    'Giám định phù lục',
    'embercity',
    'Chỉ một đạo phù có thể gia trì cùng lúc. Luyện đủ nguyên liệu, kích hoạt đúng lúc trước khi vào phó bản.',
  ],
];
export const ADVENTURE_NPCS = people.map(([key, name, role, mapId, dialogue], i) => ({
  id: `dao-npc-${key}`,
  name,
  role,
  mapId,
  dialogue,
  symbol: ['商', '蝶', '符', '木', '音', '书', '锤', '魂', '灯', '狐', '途', '印'][i],
  minStage: ADVENTURE_MAPS.find((m) => m.id === mapId)!.minStage,
  gift: (i % 2 ? 'ore' : 'herb') as 'ore' | 'herb',
  reward: (i % 3 ? 'essence' : 'pill') as 'essence' | 'pill',
}));

const companions: [string, string, string, number, DaoAttribute, string][] = [
  [
    'fox',
    'Thanh Vĩ Hồ',
    '🦊',
    0,
    'cultivation',
    'Tìm linh tuyền giữa sương sớm, gia trì mỗi phút thiền.',
  ],
  ['turtle', 'Huyền Ngọc Quy', '🐢', 4, 'defense', 'Mai ngọc ghi lại những lần bảo vệ chủ nhân.'],
  [
    'crane',
    'Bạch Vũ Linh Hạc',
    '🕊️',
    8,
    'health',
    'Lông trắng dẫn đường về động thiên khi thể lực cạn.',
  ],
  [
    'deer',
    'Mộng Điệp Linh Lộc',
    '🦌',
    12,
    'cultivation',
    'Sừng mọc như nhánh cây trong giấc mộng.',
  ],
  ['tiger', 'Ly Hỏa Bạch Hổ', '🐯', 24, 'attack', 'Tàn lửa không tắt trên dấu chân chiến thú.'],
  ['owl', 'Huyền Dạ Linh Kiêu', '🦉', 32, 'defense', 'Đôi mắt nhìn xuyên tà niệm trong đêm.'],
  ['whale', 'Vân Hải Tiểu Kình', '🐳', 36, 'health', 'Bơi giữa mây và mang về tiếng hát của biển.'],
  [
    'swan',
    'Thiên Âm Tuyết Nga',
    '🦢',
    44,
    'cultivation',
    'Cất tiếng khi tâm chủ nhân trở nên yên tĩnh.',
  ],
  [
    'wolf',
    'Băng Tâm Ngân Lang',
    '🐺',
    56,
    'attack',
    'Một lời thề trung thành khắc vào băng ngàn năm.',
  ],
  [
    'dragon',
    'Tinh Hà Ấu Long',
    '🐉',
    64,
    'attack',
    'Ăn tinh trần, mơ về bầu trời chưa thành hình.',
  ],
  ['butterfly', 'Luân Hồi Hồn Điệp', '🦋', 72, 'defense', 'Đậu trên vai người đã đi qua vạn kiếp.'],
  [
    'phoenix',
    'Bình Minh Phượng Hoàng',
    '🔥',
    79,
    'health',
    'Mỗi chiếc lông là lời hứa ngày mai sẽ đến.',
  ],
];
export const PETS = companions.map(([id, name, symbol, minStage, attribute, lore], i) => ({
  id,
  name,
  symbol,
  minStage,
  attribute,
  lore,
  price: 80 * (i + 1),
  kills: i === 0 ? 0 : i * 3,
  bonus: 0.012,
}));
export const MATERIALS = [
  ['moonleaf', 'Nguyệt Linh Diệp', '🌿'],
  ['emberlotus', 'Ly Hỏa Liên', '🪷'],
  ['icebud', 'Băng Tâm Hoa', '❄️'],
  ['cloudfruit', 'Vân Linh Quả', '🍑'],
  ['soulbloom', 'Luân Hồi Hồn Hoa', '🌸'],
  ['dawnroot', 'Bình Minh Đạo Căn', '🌱'],
  ['stardust', 'Tinh Quang Sa', '✨'],
  ['inkstone', 'Huyền Văn Mặc', '🖋️'],
  ['bellshard', 'Thiên Âm Mảnh', '🔔'],
  ['dragonjade', 'Tinh Long Ngọc', '💎'],
  ['soulthread', 'Hồn Ti', '🧵'],
  ['dawnash', 'Thiên Đăng Tro', '☀️'],
].map(([id, name, symbol]) => ({ id, name, symbol }));
export const SEEDS = [
  ['moonleaf', 0, 120, 12],
  ['emberlotus', 12, 240, 24],
  ['icebud', 24, 360, 40],
  ['cloudfruit', 36, 600, 70],
  ['soulbloom', 64, 900, 120],
  ['dawnroot', 79, 1200, 180],
].map(([material, minStage, seconds, price]) => ({
  id: String(material),
  material: String(material),
  name: MATERIALS.find((m) => m.id === material)!.name,
  minStage: Number(minStage),
  seconds: Number(seconds),
  price: Number(price),
}));
export const EXPEDITIONS = [
  [
    'quay',
    'Hộ tống linh thuyền',
    'jadeharbor',
    0,
    180,
    'stardust',
    'Lục Tam Nương nhờ thu hồi tinh sa bên bến thuyền.',
  ],
  [
    'memory',
    'Tìm trang đạo thư',
    'whisperwood',
    12,
    300,
    'inkstone',
    'Điệp Vô Ưu gửi một cánh bướm đi tìm ký ức cũ.',
  ],
  [
    'bells',
    'Lặn tìm cổ chung',
    'bellisland',
    44,
    420,
    'bellshard',
    'Cửu Âm cần những mảnh chuông để ghép lại tiên khúc.',
  ],
  [
    'bridge',
    'Dựng cầu tinh hà',
    'starforge',
    64,
    600,
    'dragonjade',
    'Tinh Chùy chờ ngọc để hoàn tất cây cầu vượt thần quốc.',
  ],
  [
    'ferry',
    'Đưa hồn vượt sông',
    'soulriver',
    72,
    720,
    'soulthread',
    'Mạnh Thanh gửi đạo hữu tìm đường cho các hồn lạc.',
  ],
  [
    'dawn',
    'Thắp lại thiên đăng',
    'dawnrealm',
    79,
    900,
    'dawnash',
    'Một ngọn đèn nhỏ mang bình minh trở về tam giới.',
  ],
].map(([id, name, mapId, minStage, seconds, material, lore]) => ({
  id: String(id),
  name: String(name),
  mapId: String(mapId),
  minStage: Number(minStage),
  seconds: Number(seconds),
  material: String(material),
  lore: String(lore),
}));
const charms: [string, string, DaoAttribute, number, string, string][] = [
  ['breath', 'Thanh Tâm Dẫn Khí Phù', 'cultivation', 0, 'moonleaf', 'stardust'],
  ['guard', 'Ngọc Giáp Hộ Thân Phù', 'defense', 0, 'moonleaf', 'stardust'],
  ['flame', 'Ly Hỏa Phá Quân Phù', 'attack', 12, 'emberlotus', 'inkstone'],
  ['vital', 'Hồi Nguyên Trường Sinh Phù', 'health', 12, 'emberlotus', 'inkstone'],
  ['ice', 'Băng Tâm Tĩnh Niệm Phù', 'cultivation', 24, 'icebud', 'inkstone'],
  ['mirror', 'Huyền Băng Kính Phù', 'defense', 24, 'icebud', 'stardust'],
  ['cloud', 'Vân Hải Tiên Hành Phù', 'health', 44, 'cloudfruit', 'bellshard'],
  ['chime', 'Thiên Âm Trấn Tà Phù', 'attack', 44, 'cloudfruit', 'bellshard'],
  ['star', 'Tinh Hà Tru Ma Phù', 'attack', 64, 'soulbloom', 'dragonjade'],
  ['soul', 'Luân Hồi Hộ Mệnh Phù', 'health', 72, 'soulbloom', 'soulthread'],
  ['dawn', 'Bình Minh Ngộ Đạo Phù', 'cultivation', 79, 'dawnroot', 'dawnash'],
  ['origin', 'Thái Sơ Bất Diệt Phù', 'defense', 79, 'dawnroot', 'dawnash'],
];
export const TALISMANS = charms.map(([id, name, attribute, minStage, plant, dust]) => ({
  id,
  name,
  attribute,
  minStage,
  plant,
  dust,
  bonus: 0.12,
  duration: 600,
  quantity: 2,
  description: `Gia trì ${DAO_LABELS[attribute]} +12% trong 10 phút. Một phù đang hoạt động tại một thời điểm.`,
}));

export const ADVENTURE_MANUALS = [
  ['beast', 'Ngự Thú Đồng Tâm Quyết', 0, 'cultivation'],
  ['sprout', 'Linh Viên Tứ Thời Kinh', 4, 'health'],
  ['seal', 'Huyền Văn Chân Giải', 12, 'defense'],
  ['embers', 'Ly Hỏa Phù Kinh', 24, 'attack'],
  ['song', 'Cửu Âm Định Hồn Khúc', 44, 'cultivation'],
  ['frost', 'Băng Tâm Vô Trần Kinh', 56, 'defense'],
  ['bridge', 'Tinh Hà Kiếm Lục', 64, 'attack'],
  ['dawn', 'Bình Minh Bất Diệt Kinh', 79, 'health'],
].map(([key, name, stage, attribute]) => ({
  id: `dao-manual-${key}`,
  name: String(name),
  minStage: Number(stage),
  attribute: attribute as DaoAttribute,
  world: (Number(stage) < 36 ? 'earth' : Number(stage) < 64 ? 'immortal' : 'divine') as World,
  symbol: '道',
  bonus: 0.025,
  description: 'Đạo pháp của Động Thiên. Tham ngộ từng tầng và trang bị để nhận gia trì.',
}));
export const ADVENTURE_DUNGEONS = regions
  .filter((_, i) => i !== 1 && i !== 5 && i !== 7)
  .map(([key, name, world, minStage]) => ({
    id: `dao-dungeon-${key}`,
    name: `${name} · Cổ Trận`,
    world,
    mapId: key,
    minStage,
    names: [`${name} Mộc Vệ`, `${name} Hộ Pháp`, `${name} Trận Chủ`] as [string, string, string],
    lore: `Vượt ba cửa để tháo phong ấn còn sót lại ở ${name}. Linh thú và phù lục có thể gia trì khi chiến đấu.`,
  }));
export const ADVENTURE_QUESTS: Quest[] = [
  {
    id: 'dao-arrival',
    name: 'Một lời hứa ở thương cảng',
    description: 'Gặp Lan Nhược tại Ngọc Lan Thương Cảng.',
    category: 'main',
    minStage: 0,
    target: 1,
    progress: (s) => Number(s.npcMet.includes('dao-npc-lan')),
    stones: 60,
    xp: 20,
    item: 'herb',
  },
  {
    id: 'dao-garden',
    name: 'Hạt giống đầu tiên',
    description: 'Sau khi nhận lời Lan Nhược, trồng và thu hoạch ít nhất một mùa linh dược.',
    category: 'main',
    minStage: 0,
    target: 1,
    progress: (s) => s.adventure.harvests,
    stones: 80,
    xp: 30,
    item: 'ore',
    reveal: (s) => s.claimed.includes('dao-arrival'),
  },
  {
    id: 'dao-companion',
    name: 'Người bạn dưới ánh trăng',
    description: 'Kết khế ước với một linh thú trong Động Thiên.',
    category: 'main',
    minStage: 0,
    target: 1,
    progress: (s) => Object.keys(s.adventure.pets).length,
    stones: 100,
    xp: 40,
    item: 'pill',
    reveal: (s) => s.claimed.includes('dao-garden'),
  },
  {
    id: 'dao-voyage',
    name: 'Con thuyền trở về',
    description: 'Hoàn thành một chuyến viễn chinh và nhận nguyên liệu.',
    category: 'main',
    minStage: 0,
    target: 1,
    progress: (s) => Object.values(s.adventure.expeditions.completed).reduce((a, b) => a + b, 0),
    stones: 120,
    xp: 50,
    item: 'essence',
    reveal: (s) => s.claimed.includes('dao-companion'),
  },
  {
    id: 'dao-firstseal',
    name: 'Nét mực chứa thiên đạo',
    description: 'Luyện một phù lục từ linh dược và nguyên liệu viễn chinh.',
    category: 'main',
    minStage: 0,
    target: 1,
    progress: (s) => s.adventure.sealsCrafted,
    stones: 150,
    xp: 60,
    item: 'elixir',
    reveal: (s) => s.claimed.includes('dao-voyage'),
  },
  {
    id: 'dao-firsttrade',
    name: 'Đạo hữu cùng chung tiên lộ',
    description: 'Hoàn thành một giao dịch mua hoặc bán với người chơi thật tại Vạn Bảo Các.',
    category: 'main',
    minStage: 0,
    target: 1,
    progress: (s) => s.adventure.marketTrades,
    stones: 120,
    xp: 50,
    item: 'key',
    reveal: (s) => s.claimed.includes('dao-firstseal'),
  },
  ...regions
    .slice(3)
    .map(([key, name, _world, minStage], i): Quest => ({
      id: `dao-story-${key}`,
      name: [
        'Mùa xuân trở lại',
        'Khúc nhạc tìm nhà',
        'Lời hứa trên trang băng',
        'Cây cầu cho người ở lại',
        'Một chuyến đò không quên',
        'Bình minh của tam giới',
      ][i],
      description: `Gặp người giữ ${name} và khám phá vùng này ${i + 2} lần.`,
      category: i === 5 ? 'hidden' : 'main',
      minStage,
      target: i + 2,
      progress: (s) =>
        s.npcMet.some((id) => ADVENTURE_NPCS.some((n) => n.id === id && n.mapId === key))
          ? s.encounters.visits[key] || 0
          : 0,
      stones: 300 * (i + 1),
      xp: 120 * (i + 1),
      item: 'key',
      reveal: (s) => (i === 5 ? s.adventure.reputation >= 20 : s.stage >= minStage),
    })),
];
export const ADVENTURE_CONTENT_COUNT =
  ADVENTURE_MAPS.length +
  ADVENTURE_NPCS.length +
  PETS.length +
  MATERIALS.length +
  SEEDS.length +
  EXPEDITIONS.length +
  TALISMANS.length +
  ADVENTURE_MANUALS.length +
  ADVENTURE_DUNGEONS.length +
  ADVENTURE_QUESTS.length;
export const adventureDefaults = () => ({
  pets: {} as Record<string, { level: number; bond: number }>,
  activePet: null as string | null,
  materials: {} as Record<string, number>,
  talismans: {} as Record<string, number>,
  activeTalisman: null as { id: string; until: number } | null,
  garden: [] as { plot: number; seed: string; plantedAt: number; readyAt: number }[],
  plots: 3,
  harvests: 0,
  sealsCrafted: 0,
  reputation: 0,
  marketTrades: 0,
  expeditions: {
    active: null as { id: string; readyAt: number } | null,
    completed: {} as Record<string, number>,
  },
});
export function adventureBonuses(s: GameState) {
  const result: { attribute: DaoAttribute; bonus: number }[] = [];
  const pet = PETS.find((p) => p.id === s.adventure?.activePet);
  if (pet)
    result.push({
      attribute: pet.attribute,
      bonus: pet.bonus * (s.adventure.pets[pet.id]?.level || 0),
    });
  const charm = TALISMANS.find((t) => t.id === s.adventure?.activeTalisman?.id);
  if (charm && s.adventure.activeTalisman!.until > s.lastTick)
    result.push({ attribute: charm.attribute, bonus: charm.bonus });
  return result;
}
