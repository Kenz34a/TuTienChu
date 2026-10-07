export type World = 'earth' | 'immortal' | 'divine';
export type EnemyKind = 'normal' | 'elite' | 'boss' | 'dungeon';
export type Slot = 'robe' | 'hat' | 'pants' | 'boots' | 'ring' | 'gloves' | 'necklace';
export type RaceId = 'human' | 'spirit' | 'dragon' | 'fox' | 'ancient';
export type ItemId = 'herb' | 'ore' | 'essence' | 'pill' | 'elixir' | 'key';
export type BreakthroughMethod = 'meditation' | 'pill' | 'array';
export interface Gear {
  uid: string;
  slot: Slot;
  rank: number;
  level: number;
}
export interface Event {
  id: number;
  text: string;
  type: 'story' | 'gain' | 'battle' | 'realm';
  time: number;
}
export interface Battle {
  enemyId: string;
  kind: EnemyKind;
  enemyStage: number;
  enraged: boolean;
  secretId?: string;
  dungeonId?: string;
  wave?: number;
  mapId: string;
  name: string;
  title: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  turn: number;
  logs: string[];
  skillCooldown: number;
}
export interface GameState {
  adventure: ReturnType<typeof import('./ascension').adventureDefaults>;
  version: 2;
  name: string;
  race: RaceId;
  raceChosen: boolean;
  stage: number;
  xp: number;
  stones: number;
  wallet: { immortal: number; divine: number };
  hp: number;
  stamina: number;
  lastTick: number;
  inventory: Partial<Record<ItemId, number>>;
  bag: Gear[];
  equipped: Partial<Record<Slot, Gear>>;
  metrics: {
    meditations: number;
    kills: number;
    breakthroughs: number;
    explorations: number;
    crafts: number;
    donations: number;
    trades: number;
  };
  explored: string[];
  encounters: {
    visits: Partial<Record<string, number>>;
    seen: string[];
    eliteKills: number;
    discoveredSecrets: string[];
    defeatedBosses: string[];
  };
  npcMet: string[];
  claimed: string[];
  daily: { date: string; meditations: number; kills: number; claimed: string[] };
  sect: string | null;
  contribution: number;
  events: Event[];
  battle: Battle | null;
  nextUid: number;
  incenseUntil: number;
  lingqi: number;
  training: { active: boolean; remainder: number; totalSeconds: number; boostedSeconds: number };
  manuals: Record<string, number>;
  activeManuals: string[];
  customSect: null | {
    name: string;
    level: number;
    members: number;
    treasury: number;
    buildings: { hall: number; training: number; alchemy: number };
  };
  dungeons: {
    active: { id: string; wave: number } | null;
    clears: Record<string, number>;
    cooldowns: Record<string, number>;
  };
  worldBossClaims: number;
  spiritualRoot: null | { id: string; level: number };
  inheritances: string[];
  titles: { owned: string[]; equipped: string | null; effects: boolean };
}
export interface Stats {
  maxHp: number;
  attack: number;
  defense: number;
  cultivation: number;
  crit: number;
}
export type Action =
  | {
      type:
        | 'adopt-pet'
        | 'feed-pet'
        | 'activate-pet'
        | 'craft-talisman'
        | 'use-talisman'
        | 'start-expedition';
      id: string;
    }
  | { type: 'plant'; id: string; plot: number }
  | { type: 'harvest'; plot: number }
  | { type: 'expand-garden' | 'collect-expedition' }
  | { type: 'equip-title'; id: string | null }
  | { type: 'title-effects'; enabled: boolean }
  | { type: 'meditate' }
  | { type: 'stop-training' }
  | { type: 'study'; id: string }
  | { type: 'activate-manual'; id: string }
  | { type: 'found-sect'; name: string }
  | { type: 'sect-build'; building: 'hall' | 'training' | 'alchemy' }
  | { type: 'recruit' }
  | { type: 'leave-sect' }
  | { type: 'dungeon'; id: string }
  | { type: 'awaken-root' }
  | { type: 'purify-root' }
  | { type: 'inherit'; id: string }
  | { type: 'exchange-currency'; from: 'spirit' | 'immortal' | 'divine'; direction: 'up' | 'down' }
  | { type: 'breakthrough'; method?: BreakthroughMethod }
  | { type: 'rest' }
  | { type: 'tick'; now: number }
  | { type: 'explore'; mapId: string }
  | { type: 'challenge'; secretId: string }
  | { type: 'fight'; move: 'attack' | 'skill' | 'guard' | 'pill' | 'flee' }
  | { type: 'equip'; uid: string }
  | { type: 'unequip'; slot: Slot }
  | { type: 'upgrade'; slot: Slot }
  | { type: 'salvage'; uid: string }
  | { type: 'craft'; recipe: 'pill' | 'elixir' | 'gear' }
  | { type: 'buy'; item: ItemId }
  | { type: 'sell'; item: ItemId }
  | { type: 'use'; item: 'pill' | 'elixir' }
  | { type: 'quest'; id: string }
  | { type: 'join'; sectId: string }
  | { type: 'donate' }
  | { type: 'npc'; npcId: string; choice: 'talk' | 'gift' }
  | { type: 'profile'; name: string; race?: RaceId }
  | { type: 'incense' };
export interface Result {
  state: GameState;
  message?: string;
  ok: boolean;
}
