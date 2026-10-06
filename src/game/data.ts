import type { GameState, ItemId, RaceId, Slot, World } from './types';

export const REALMS = [
  'Luyện Khí',
  'Trúc Cơ',
  'Kim Đan',
  'Nguyên Anh',
  'Hóa Thần',
  'Luyện Hư',
  'Hợp Thể',
  'Đại Thừa',
  'Độ Kiếp',
  'Chân Tiên',
  'Huyền Tiên',
  'Kim Tiên',
  'Thái Ất',
  'Đại La',
  'Tiên Vương',
  'Tiên Đế',
  'Chân Thần',
  'Thiên Thần',
  'Thần Vương',
  'Thần Đế',
];
export const STAGES = ['Sơ kỳ', 'Trung kỳ', 'Đỉnh phong'];
export const realmName = (stage: number) => `${REALMS[Math.floor(stage / 3)]} ${STAGES[stage % 3]}`;
export const xpNeeded = (stage: number) => Math.round(100 * Math.pow(1.18, stage));
export const stoneCost = (stage: number) => Math.round(40 * Math.pow(1.12, stage));
export const WORLDS: {
  id: World;
  name: string;
  sub: string;
  minStage: number;
  description: string;
}[] = [
  {
    id: 'earth',
    name: 'Địa Giới',
    sub: 'Nơi đạo lộ bắt đầu',
    minStage: 0,
    description: 'Núi xanh ngàn dặm, linh khí còn vương. Mỗi bước chân đều là một cơ duyên.',
  },
  {
    id: 'immortal',
    name: 'Tiên Giới',
    sub: 'Vượt phàm thành tiên',
    minStage: 27,
    description: 'Vân hải vô tận, tiên cung ẩn hiện. Phía sau thiên môn là một thế giới mới.',
  },
  {
    id: 'divine',
    name: 'Thần Giới',
    sub: 'Chạm đến thiên đạo',
    minStage: 48,
    description: 'Tinh hà trải rộng, cổ thần ngủ say. Ai sẽ viết lại trật tự của tam giới?',
  },
];
export const SLOTS: { id: Slot; name: string; symbol: string }[] = [
  { id: 'robe', name: 'Áo', symbol: '衫' },
  { id: 'hat', name: 'Mũ', symbol: '冠' },
  { id: 'pants', name: 'Quần', symbol: '裳' },
  { id: 'boots', name: 'Giày', symbol: '履' },
  { id: 'ring', name: 'Nhẫn', symbol: '戒' },
  { id: 'gloves', name: 'Găng tay', symbol: '掌' },
  { id: 'necklace', name: 'Vòng cổ', symbol: '佩' },
];
export const RANKS = [
  { name: 'Phàm phẩm', color: '#7c817b', prefix: 'Thanh Vân' },
  { name: 'Linh phẩm', color: '#508267', prefix: 'Bích Linh' },
  { name: 'Pháp phẩm', color: '#4d84a6', prefix: 'Huyền Ngọc' },
  { name: 'Bảo phẩm', color: '#8d6caa', prefix: 'Tử Hà' },
  { name: 'Linh bảo', color: '#b1883d', prefix: 'Thiên Cương' },
  { name: 'Đạo phẩm', color: '#bc6c47', prefix: 'Vô Cực' },
  { name: 'Tiên phẩm', color: '#aa5682', prefix: 'Cửu Thiên' },
  { name: 'Thần phẩm', color: '#bd5146', prefix: 'Thái Sơ' },
  { name: 'Hỗn Độn', color: '#936c30', prefix: 'Hồng Mông' },
];
export const RACES: {
  id: RaceId;
  name: string;
  symbol: string;
  description: string;
  bonus: string;
}[] = [
  {
    id: 'human',
    name: 'Nhân tộc',
    symbol: '人',
    description: 'Tâm bền như đá, đạo lộ vô hạn.',
    bonus: 'Tu luyện +15%',
  },
  {
    id: 'spirit',
    name: 'Linh tộc',
    symbol: '灵',
    description: 'Sinh từ thiên địa, hợp nhất linh khí.',
    bonus: 'Tu luyện +25%, sinh lực −10%',
  },
  {
    id: 'dragon',
    name: 'Long tộc',
    symbol: '龙',
    description: 'Huyết mạch chân long, thân thể bất diệt.',
    bonus: 'Sinh lực +25%, phòng thủ +10%',
  },
  {
    id: 'fox',
    name: 'Hồ tộc',
    symbol: '狐',
    description: 'Chín đuôi che nguyệt, linh trí hơn người.',
    bonus: 'Chí mạng +15%',
  },
  {
    id: 'ancient',
    name: 'Cổ tộc',
    symbol: '古',
    description: 'Mang di sản của những vị thần đầu tiên.',
    bonus: 'Công kích +20%',
  },
];
export const ITEMS: Record<
  ItemId,
  { name: string; symbol: string; description: string; price: number }
> = {
  herb: {
    name: 'Linh thảo',
    symbol: '草',
    description: 'Thảo dược chứa linh khí, dùng để luyện đan.',
    price: 12,
  },
  ore: {
    name: 'Huyền thiết',
    symbol: '矿',
    description: 'Khoáng thạch để chế tạo pháp khí.',
    price: 20,
  },
  essence: {
    name: 'Tinh hoa',
    symbol: '晶',
    description: 'Cường hóa trang bị, tối đa +10.',
    price: 35,
  },
  pill: { name: 'Hồi Xuân Đan', symbol: '丹', description: 'Hồi 50% sinh lực tối đa.', price: 30 },
  elixir: {
    name: 'Tụ Linh Đan',
    symbol: '灵',
    description: 'Nhận 35% tu vi cần cho cảnh giới hiện tại.',
    price: 80,
  },
  key: {
    name: 'Cổ ngọc',
    symbol: '玉',
    description: 'Di vật hiếm, mở khóa cơ duyên ẩn.',
    price: 200,
  },
};
export interface MapData {
  id: string;
  name: string;
  world: World;
  minStage: number;
  subtitle: string;
  enemy: string;
  enemyTitle: string;
  difficulty: string;
  terrain: 'forest' | 'mountain' | 'temple' | 'lake';
  lore: string;
}
export const MAPS: MapData[] = [
  {
    id: 'bamboo',
    name: 'Thanh Trúc Lâm',
    world: 'earth',
    minStage: 0,
    subtitle: 'Gió lay trúc, linh khí tụ',
    enemy: 'Thanh Lang',
    enemyTitle: 'Yêu thú',
    difficulty: 'Bình yên',
    terrain: 'forest',
    lore: 'Một chiếc chuông bạc vang lên trong rừng trúc. Người tiều phu kể rằng nơi đây từng có một vị tiên nhân ẩn cư.',
  },
  {
    id: 'mountain',
    name: 'Vân Vụ Sơn',
    world: 'earth',
    minStage: 3,
    subtitle: 'Mây phủ ngàn tầng núi',
    enemy: 'Xích Diễm Hổ',
    enemyTitle: 'Yêu tướng',
    difficulty: 'Hiểm trở',
    terrain: 'mountain',
    lore: 'Những vết chân cháy đỏ dẫn lên sườn núi. Linh thạch lấp lánh dưới lớp sương mù.',
  },
  {
    id: 'lake',
    name: 'Hàn Nguyệt Đàm',
    world: 'earth',
    minStage: 9,
    subtitle: 'Ánh trăng dưới đáy hồ',
    enemy: 'Hàn Giao',
    enemyTitle: 'Yêu vương',
    difficulty: 'Nguy hiểm',
    terrain: 'lake',
    lore: 'Mặt hồ tĩnh lặng phản chiếu hai vầng trăng. Một con giao long giữ bí mật dưới đáy nước.',
  },
  {
    id: 'ruins',
    name: 'Cổ Kiếm Di Tích',
    world: 'earth',
    minStage: 18,
    subtitle: 'Kiếm ý còn vang ngàn năm',
    enemy: 'Kiếm Linh',
    enemyTitle: 'Yêu hoàng',
    difficulty: 'Đại hung',
    terrain: 'temple',
    lore: 'Kiếm gãy vẫn ngân dài giữa tàn tích. Kẻ vượt qua kiếm trận sẽ tìm thấy một lời thề chưa trọn.',
  },
  {
    id: 'gate',
    name: 'Nam Thiên Môn',
    world: 'immortal',
    minStage: 27,
    subtitle: 'Một bước vượt phàm trần',
    enemy: 'Vân Sư',
    enemyTitle: 'Yêu đế',
    difficulty: 'Tiên cảnh',
    terrain: 'temple',
    lore: 'Cánh cửa bằng bạch ngọc mở ra giữa biển mây. Tiếng hạc gọi từ phía bên kia.',
  },
  {
    id: 'peach',
    name: 'Bàn Đào Viên',
    world: 'immortal',
    minStage: 30,
    subtitle: 'Hoa nở ba nghìn năm',
    enemy: 'Đào Yêu',
    enemyTitle: 'Yêu tiên',
    difficulty: 'Huyền bí',
    terrain: 'forest',
    lore: 'Cánh hoa đào không bao giờ chạm đất. Mỗi quả chín mang một giấc mơ của tiên nhân.',
  },
  {
    id: 'sea',
    name: 'Vô Tận Vân Hải',
    world: 'immortal',
    minStage: 36,
    subtitle: 'Mây là biển, hạc là thuyền',
    enemy: 'Cửu Dực Bằng',
    enemyTitle: 'Yêu thánh',
    difficulty: 'Hung hiểm',
    terrain: 'lake',
    lore: 'Không có chân trời giữa biển mây. Bóng chim đại bằng phủ kín một thành trì nổi.',
  },
  {
    id: 'palace',
    name: 'Lăng Tiêu Tiên Cung',
    world: 'immortal',
    minStage: 42,
    subtitle: 'Đạo vận giữa trời cao',
    enemy: 'Thiên Lôi Long',
    enemyTitle: 'Yêu tôn',
    difficulty: 'Thiên kiếp',
    terrain: 'temple',
    lore: 'Chín hồi chuông vang khắp tiên giới. Lôi long cuộn mình quanh ngai vàng trống.',
  },
  {
    id: 'stars',
    name: 'Tinh Hà Cổ Lộ',
    world: 'divine',
    minStage: 48,
    subtitle: 'Ngàn sao hóa đạo lộ',
    enemy: 'Thôn Tinh Thú',
    enemyTitle: 'Yêu thần',
    difficulty: 'Thần vực',
    terrain: 'lake',
    lore: 'Bạn bước trên những ngôi sao đã tắt. Vọng âm của cổ thần kể về buổi đầu thiên địa.',
  },
  {
    id: 'abyss',
    name: 'Vực Thái Sơ',
    world: 'divine',
    minStage: 51,
    subtitle: 'Nơi thời gian ngừng chảy',
    enemy: 'Hư Không Ma',
    enemyTitle: 'Yêu thần vương',
    difficulty: 'Cấm địa',
    terrain: 'mountain',
    lore: 'Một vực sâu không có đáy, nơi ngày và đêm cùng tồn tại. Đạo tâm là ngọn đèn duy nhất.',
  },
  {
    id: 'throne',
    name: 'Vạn Thần Điện',
    world: 'divine',
    minStage: 54,
    subtitle: 'Vạn thần cùng cúi đầu',
    enemy: 'Cổ Thần Chi Ảnh',
    enemyTitle: 'Yêu thần hoàng',
    difficulty: 'Thần kiếp',
    terrain: 'temple',
    lore: 'Vạn chiếc ngai phủ bụi. Những cái tên bị lãng quên đang chờ bạn gọi lại.',
  },
  {
    id: 'chaos',
    name: 'Hồng Mông Chi Địa',
    world: 'divine',
    minStage: 57,
    subtitle: 'Một niệm sinh vạn vật',
    enemy: 'Hỗn Độn Tổ Yêu',
    enemyTitle: 'Yêu tổ',
    difficulty: 'Chung cực',
    terrain: 'mountain',
    lore: 'Không còn trời, không còn đất. Chỉ có một niệm, và mọi khả năng của vũ trụ.',
  },
];
export const SECTS = [
  {
    id: 'cloud',
    name: 'Thanh Vân Tông',
    symbol: '云',
    motto: 'Thanh tâm tĩnh khí · Thuận đạo tự nhiên',
    bonus: 'Tu luyện +20%',
    description:
      'Ẩn mình giữa vân sơn, lấy đạo tâm làm gốc. Nơi thích hợp cho người muốn đi xa trên con đường tu hành.',
  },
  {
    id: 'sword',
    name: 'Vạn Kiếm Sơn',
    symbol: '剑',
    motto: 'Nhất kiếm phá vạn pháp',
    bonus: 'Công kích +15%',
    description: 'Một kiếm trong tay, thiên hạ vô úy. Các đệ tử lấy chiến đấu để rèn đạo tâm.',
  },
  {
    id: 'lotus',
    name: 'Bích Liên Cốc',
    symbol: '莲',
    motto: 'Tế thế cứu nhân · Vạn vật hữu linh',
    bonus: 'Sinh lực +20%',
    description:
      'Hương đan lan khắp cốc xanh. Tông môn coi trọng sinh mệnh và nghệ thuật luyện đan.',
  },
];
export const NPCS = [
  {
    id: 'elder',
    name: 'Vân Hạc Chân Nhân',
    role: 'Người dẫn đạo',
    symbol: '鹤',
    mapId: 'bamboo',
    minStage: 0,
    dialogue:
      '“Tiên lộ không nằm ở cuối con đường. Nó ở từng bước chân của con. Tĩnh tâm tu luyện, tích lũy tu vi rồi hãy đột phá.”',
    gift: 'herb' as ItemId,
    reward: 'elixir' as ItemId,
  },
  {
    id: 'merchant',
    name: 'Lục Tam Nương',
    role: 'Thương nhân du hành',
    symbol: '商',
    mapId: 'bamboo',
    minStage: 0,
    dialogue:
      '“Linh thạch có thể kiếm lại, cơ duyên thì không. Ta đổi một viên huyền thiết lấy hồi xuân đan, đạo hữu có hứng thú chứ?”',
    gift: 'ore' as ItemId,
    reward: 'pill' as ItemId,
  },
  {
    id: 'swordsman',
    name: 'Mặc Vô Trần',
    role: 'Kiếm khách bí ẩn',
    symbol: '剑',
    mapId: 'mountain',
    minStage: 3,
    dialogue:
      '“Kiếm mạnh chưa chắc tâm vững. Mang cổ ngọc đến đây, ta sẽ cho ngươi biết câu chuyện phía sau vết kiếm này.”',
    gift: 'key' as ItemId,
    reward: 'elixir' as ItemId,
  },
  {
    id: 'fairy',
    name: 'Nguyệt Dao Tiên Tử',
    role: 'Người giữ tiên môn',
    symbol: '月',
    mapId: 'gate',
    minStage: 27,
    dialogue:
      '“Cuối cùng đạo hữu cũng đến. Tiên giới rộng lớn hơn điều chúng ta tưởng. Hãy giữ một phần phàm tâm bên mình.”',
    gift: 'herb' as ItemId,
    reward: 'essence' as ItemId,
  },
  {
    id: 'god',
    name: 'Thái Huyền Cổ Thần',
    role: 'Kẻ chứng kiến thời gian',
    symbol: '玄',
    mapId: 'stars',
    minStage: 48,
    dialogue:
      '“Thần cũng từng là người. Vạn vật hữu hạn, chỉ đạo tâm trường tồn. Ngươi đã sẵn sàng viết câu chuyện của chính mình?”',
    gift: 'essence' as ItemId,
    reward: 'key' as ItemId,
  },
];
export interface Quest {
  id: string;
  name: string;
  description: string;
  category: 'main' | 'daily' | 'hidden';
  minStage: number;
  target: number;
  progress: (s: GameState) => number;
  stones: number;
  xp: number;
  item?: ItemId;
  reveal?: (s: GameState) => boolean;
}
export const QUESTS: Quest[] = [
  {
    id: 'first',
    name: 'Một niệm nhập đạo',
    description: 'Tĩnh tâm tu luyện 3 lần để cảm nhận linh khí.',
    category: 'main',
    minStage: 0,
    target: 3,
    progress: (s) => s.metrics.meditations,
    stones: 60,
    xp: 35,
    item: 'pill',
  },
  {
    id: 'trail',
    name: 'Bước chân đầu tiên',
    description: 'Khám phá Thanh Trúc Lâm và đánh bại 2 yêu thú.',
    category: 'main',
    minStage: 0,
    target: 2,
    progress: (s) => s.metrics.kills,
    stones: 80,
    xp: 40,
    item: 'ore',
  },
  {
    id: 'alchemy',
    name: 'Hương đan đầu mùa',
    description: 'Chế tạo đan dược hoặc trang bị 2 lần.',
    category: 'main',
    minStage: 0,
    target: 2,
    progress: (s) => s.metrics.crafts,
    stones: 100,
    xp: 50,
    item: 'essence',
  },
  {
    id: 'sect',
    name: 'Tìm một chốn nương thân',
    description: 'Gia nhập một tông môn trong tam đại tiên tông.',
    category: 'main',
    minStage: 0,
    target: 1,
    progress: (s) => (s.sect ? 1 : 0),
    stones: 60,
    xp: 25,
  },
  ...REALMS.map((realm, i): Quest => ({
    id: `realm-${i}`,
    name: `${realm} · Trừ yêu vệ đạo`,
    description: `Đạt ${realm}, tích lũy ${(i + 1) * 3} lần thắng yêu quái.`,
    category: 'main',
    minStage: i * 3,
    target: (i + 1) * 3,
    progress: (s) => s.metrics.kills,
    stones: Math.round(100 * Math.pow(1.3, i)),
    xp: Math.round(xpNeeded(i * 3) * 0.4),
    item: i % 2 ? 'elixir' : 'essence',
  })),
  {
    id: 'daily-cultivate',
    name: 'Công khóa mỗi ngày',
    description: 'Tu luyện 5 lần trong ngày hôm nay.',
    category: 'daily',
    minStage: 0,
    target: 5,
    progress: (s) => s.daily.meditations,
    stones: 60,
    xp: 40,
    item: 'herb',
  },
  {
    id: 'daily-hunt',
    name: 'Trấn yêu thường nhật',
    description: 'Thắng 3 trận chiến trong ngày hôm nay.',
    category: 'daily',
    minStage: 0,
    target: 3,
    progress: (s) => s.daily.kills,
    stones: 100,
    xp: 60,
    item: 'pill',
  },
  {
    id: 'hidden-elder',
    name: 'Lời nhắn trong rừng trúc',
    description: 'Gặp Vân Hạc Chân Nhân, tu luyện 10 lần.',
    category: 'hidden',
    minStage: 0,
    target: 10,
    progress: (s) => s.metrics.meditations,
    stones: 150,
    xp: 100,
    item: 'key',
    reveal: (s) => s.npcMet.includes('elder'),
  },
  {
    id: 'hidden-wanderer',
    name: 'Người đi qua tam giới',
    description: 'Đặt chân đến 6 địa điểm khác nhau.',
    category: 'hidden',
    minStage: 0,
    target: 6,
    progress: (s) => s.explored.length,
    stones: 2000,
    xp: 5000,
    item: 'key',
    reveal: (s) => s.explored.length >= 3,
  },
  {
    id: 'hidden-sword',
    name: 'Cổ ngọc và một lời thề',
    description: 'Gặp Mặc Vô Trần và sở hữu ít nhất một cổ ngọc.',
    category: 'hidden',
    minStage: 3,
    target: 1,
    progress: (s) => Math.min(1, s.inventory.key || 0),
    stones: 350,
    xp: 250,
    item: 'elixir',
    reveal: (s) => s.npcMet.includes('swordsman'),
  },
  {
    id: 'hidden-patron',
    name: 'Tấm lòng với sơn môn',
    description: 'Đóng góp linh thạch cho tông môn 10 lần.',
    category: 'hidden',
    minStage: 0,
    target: 10,
    progress: (s) => s.metrics.donations,
    stones: 800,
    xp: 400,
    item: 'elixir',
    reveal: (s) => s.metrics.donations >= 3,
  },
];
export const questClaimed = (s: GameState, q: Quest) =>
  q.category === 'daily' ? s.daily.claimed.includes(q.id) : s.claimed.includes(q.id);
export const sectRank = (contribution: number) =>
  contribution >= 1000
    ? 'Trưởng lão'
    : contribution >= 400
      ? 'Chân truyền'
      : contribution >= 150
        ? 'Nội môn'
        : 'Ngoại môn';
