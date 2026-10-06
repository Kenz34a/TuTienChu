export type World = 'earth' | 'immortal' | 'divine';
export type EnemyKind = 'normal' | 'elite' | 'boss';
export type Slot = 'robe' | 'hat' | 'pants' | 'boots' | 'ring' | 'gloves' | 'necklace';
export type RaceId = 'human' | 'spirit' | 'dragon' | 'fox' | 'ancient';
export type ItemId = 'herb' | 'ore' | 'essence' | 'pill' | 'elixir' | 'key';
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
  version: 1;
  name: string;
  race: RaceId;
  raceChosen: boolean;
  stage: number;
  xp: number;
  stones: number;
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
}
export interface Stats {
  maxHp: number;
  attack: number;
  defense: number;
  cultivation: number;
  crit: number;
}
export type Action =
  | { type: 'meditate' }
  | { type: 'breakthrough' }
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
