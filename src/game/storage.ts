import { ITEMS, MAPS, NPCS, QUESTS, RACES, SECTS, SLOTS } from './data';
import { initialState, stats } from './engine';
import type { GameState, Gear } from './types';
import { ALL_ENEMIES, ENEMIES, SECRET_AREAS } from './encounters';
import { DUNGEONS, MANUALS, SPIRITUAL_ROOTS, INHERITANCES } from './expansion';
import { TITLES, collectTitles } from './titles';

export const SAVE_KEY = 'van-tien-ky.save.v1';
const number = (value: unknown, max = 1e12) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max;
const integer = (value: unknown, max = 1e12) => number(value, max) && Number.isInteger(value);
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max = 500) => typeof value === 'string' && value.length <= max;
const list = (value: unknown, allowed: string[]) =>
  Array.isArray(value) &&
  value.length <= allowed.length &&
  new Set(value).size === value.length &&
  value.every((v) => typeof v === 'string' && allowed.includes(v));
const gear = (g: unknown): g is Gear =>
  record(g) &&
  text(g.uid, 40) &&
  SLOTS.some((s) => s.id === g.slot) &&
  integer(g.rank, 8) &&
  integer(g.level, 10);

export function decodeSave(input: string): GameState {
  if (input.length > 250_000) throw new Error('Bản lưu quá lớn.');
  const v: unknown = JSON.parse(input);
  const invalid = () => {
    throw new Error('Bản lưu không hợp lệ hoặc không tương thích với phiên bản hiện tại.');
  };
  if (!record(v) || v.version !== 1) return invalid();
  if (
    !text(v.name, 24) ||
    !(v.name as string).trim() ||
    !RACES.some((r) => r.id === v.race) ||
    typeof v.raceChosen !== 'boolean'
  )
    return invalid();
  if (
    !integer(v.stage, 59) ||
    !number(v.xp) ||
    !number(v.stones) ||
    !number(v.hp) ||
    !number(v.stamina, 100) ||
    !number(v.lastTick, 1e15) ||
    !number(v.incenseUntil, 1e15) ||
    !integer(v.nextUid) ||
    (v.nextUid as number) < 1 ||
    !integer(v.contribution)
  )
    return invalid();
  if (
    !record(v.inventory) ||
    Object.entries(v.inventory).some(([k, n]) => !Object.hasOwn(ITEMS, k) || !integer(n, 1e8))
  )
    return invalid();
  if (
    !Array.isArray(v.bag) ||
    v.bag.length > 114 ||
    !v.bag.every(gear) ||
    !record(v.equipped) ||
    Object.entries(v.equipped).some(([slot, g]) => !gear(g) || slot !== g.slot)
  )
    return invalid();
  const gears = [...v.bag, ...Object.values(v.equipped)] as Gear[];
  if (
    new Set(gears.map((g) => g.uid)).size !== gears.length ||
    gears.some((g) => !/^g\d+$/.test(g.uid) || Number(g.uid.slice(1)) >= (v.nextUid as number))
  )
    return invalid();
  if (
    !record(v.metrics) ||
    ['meditations', 'kills', 'breakthroughs', 'explorations', 'crafts', 'donations', 'trades'].some(
      (k) => !integer(v.metrics && (v.metrics as Record<string, unknown>)[k]),
    )
  )
    return invalid();
  if (
    !list(
      v.explored,
      MAPS.map((m) => m.id),
    ) ||
    !list(
      v.npcMet,
      NPCS.map((n) => n.id),
    ) ||
    !list(
      v.claimed,
      QUESTS.filter((q) => q.category !== 'daily').map((q) => q.id),
    )
  )
    return invalid();
  const defaults = initialState();
  for (const key of [
    'lingqi',
    'training',
    'manuals',
    'activeManuals',
    'customSect',
    'dungeons',
    'worldBossClaims',
    'spiritualRoot',
    'inheritances',
    'wallet',
    'titles',
  ] as const)
    if (v[key] === undefined) v[key] = defaults[key];
  if (
    !record(v.titles) ||
    !list(
      v.titles.owned,
      TITLES.map((t) => t.id),
    ) ||
    typeof v.titles.effects !== 'boolean' ||
    (v.titles.equipped !== null &&
      (typeof v.titles.equipped !== 'string' ||
        !(v.titles.owned as string[]).includes(v.titles.equipped)))
  )
    return invalid();
  if (!record(v.wallet) || !integer(v.wallet.immortal, 1e9) || !integer(v.wallet.divine, 1e9))
    return invalid();
  if (
    v.spiritualRoot !== null &&
    (!record(v.spiritualRoot) ||
      !SPIRITUAL_ROOTS.some((r) => r.id === (v.spiritualRoot as Record<string, unknown>).id) ||
      !integer(v.spiritualRoot.level, 10) ||
      (v.spiritualRoot.level as number) < 1)
  )
    return invalid();
  if (
    !list(
      v.inheritances,
      INHERITANCES.map((i) => i.id),
    )
  )
    return invalid();
  if (
    record(v.spiritualRoot) &&
    v.spiritualRoot.id === 'chaos' &&
    !(v.inheritances as string[]).includes('origin-legacy')
  )
    return invalid();
  if (record(v.training) && v.training.boostedSeconds === undefined) v.training.boostedSeconds = 0;
  if (
    !number(v.lingqi, 1e9) ||
    !integer(v.worldBossClaims) ||
    !record(v.training) ||
    typeof v.training.active !== 'boolean' ||
    !number(v.training.remainder, 59.999999999) ||
    !number(v.training.totalSeconds) ||
    !number(v.training.boostedSeconds, v.training.remainder as number)
  )
    return invalid();
  if (
    !record(v.manuals) ||
    Object.entries(v.manuals).some(
      ([id, level]) =>
        !MANUALS.some((m) => m.id === id) || !integer(level, 10) || (level as number) < 1,
    ) ||
    !list(v.activeManuals, Object.keys(v.manuals)) ||
    (v.activeManuals as string[]).length > 3
  )
    return invalid();
  if (v.customSect !== null) {
    const c = v.customSect;
    if (
      !record(c) ||
      !text(c.name, 24) ||
      (c.name as string).trim().length < 2 ||
      !integer(c.level, 10) ||
      (c.level as number) < 1 ||
      !integer(c.members, (c.level as number) * 10) ||
      (c.members as number) < 1 ||
      !integer(c.treasury) ||
      !record(c.buildings) ||
      ['hall', 'training', 'alchemy'].some(
        (k) =>
          !integer((c.buildings as Record<string, unknown>)[k], 10) ||
          (c.buildings as Record<string, number>)[k] < 1 ||
          (c.buildings as Record<string, number>)[k] > (c.level as number),
      ) ||
      c.level !== c.buildings.hall
    )
      return invalid();
  }
  if (
    v.sect !== null &&
    !(v.sect === 'custom' && v.customSect) &&
    !SECTS.some((s) => s.id === v.sect)
  )
    return invalid();
  const dungeons = v.dungeons;
  if (
    !record(dungeons) ||
    !record(dungeons.clears) ||
    !record(dungeons.cooldowns) ||
    Object.entries(dungeons.clears).some(
      ([id, count]) => !DUNGEONS.some((d) => d.id === id) || !integer(count, 1e8),
    ) ||
    Object.entries(dungeons.cooldowns).some(
      ([id, time]) => !DUNGEONS.some((d) => d.id === id) || !number(time, 1e15),
    )
  )
    return invalid();
  if (
    dungeons.active !== null &&
    (!record(dungeons.active) ||
      !DUNGEONS.some((d) => d.id === (dungeons.active as Record<string, unknown>).id) ||
      !integer(dungeons.active.wave, 2))
  )
    return invalid();
  // Additive migration: old v1 saves keep all progress and live battles.
  if (v.encounters === undefined) {
    v.encounters = {
      visits: Object.fromEntries((v.explored as string[]).map((id) => [id, 1])),
      seen: [],
      eliteKills: 0,
      discoveredSecrets: [],
      defeatedBosses: [],
    };
  }
  const encounters = v.encounters;
  if (
    !record(encounters) ||
    !record(encounters.visits) ||
    Object.entries(encounters.visits).some(
      ([id, count]) => !MAPS.some((map) => map.id === id) || !integer(count, 1e8),
    ) ||
    !list(
      encounters.seen,
      ALL_ENEMIES.map((enemy) => enemy.id),
    ) ||
    !integer(encounters.eliteKills) ||
    !list(
      encounters.discoveredSecrets,
      SECRET_AREAS.map((area) => area.id),
    ) ||
    !list(
      encounters.defeatedBosses,
      SECRET_AREAS.map((area) => area.boss.id),
    ) ||
    (encounters.defeatedBosses as string[]).some(
      (id) =>
        !(encounters.discoveredSecrets as string[]).includes(
          SECRET_AREAS.find((area) => area.boss.id === id)!.id,
        ),
    )
  )
    return invalid();
  if (
    !record(v.daily) ||
    typeof v.daily.date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v.daily.date) ||
    !integer(v.daily.meditations) ||
    !integer(v.daily.kills) ||
    !list(
      v.daily.claimed,
      QUESTS.filter((q) => q.category === 'daily').map((q) => q.id),
    )
  )
    return invalid();
  if (
    !Array.isArray(v.events) ||
    v.events.length > 60 ||
    v.events.some(
      (e) =>
        !record(e) ||
        !integer(e.id) ||
        !text(e.text, 1000) ||
        !['story', 'gain', 'battle', 'realm'].includes(e.type as string) ||
        !number(e.time, 1e15),
    )
  )
    return invalid();
  if (v.battle !== null) {
    const b = v.battle;
    if (
      !record(b) ||
      !MAPS.some((m) => m.id === b.mapId) ||
      !text(b.name, 80) ||
      !text(b.title, 80) ||
      !number(b.hp) ||
      !number(b.maxHp) ||
      (b.maxHp as number) <= 0 ||
      (b.hp as number) > (b.maxHp as number) ||
      !number(b.attack) ||
      !number(b.defense) ||
      !integer(b.turn) ||
      !integer(b.skillCooldown, 3) ||
      !Array.isArray(b.logs) ||
      b.logs.length > 14 ||
      !b.logs.every((l) => text(l))
    )
      return invalid();
    if (
      b.enemyId === undefined &&
      b.kind === undefined &&
      b.enemyStage === undefined &&
      b.enraged === undefined &&
      b.secretId === undefined
    ) {
      const map = MAPS.find((map) => map.id === b.mapId)!;
      b.enemyId = ENEMIES.find((enemy) => enemy.mapId === map.id)!.id;
      b.kind = 'normal';
      b.enemyStage = Math.min(v.stage as number, map.minStage + 5);
      b.enraged = false;
      if (!(encounters.seen as string[]).includes(b.enemyId as string))
        (encounters.seen as string[]).push(b.enemyId as string);
    }
    const enemy = ALL_ENEMIES.find((enemy) => enemy.id === b.enemyId);
    const secret = SECRET_AREAS.find((area) => area.id === b.secretId);
    const dungeon = DUNGEONS.find((d) => d.id === b.dungeonId);
    if (
      !enemy ||
      enemy.mapId !== b.mapId ||
      enemy.kind !== b.kind ||
      !integer(b.enemyStage, 59) ||
      typeof b.enraged !== 'boolean' ||
      (b.kind === 'dungeon'
        ? !dungeon ||
          !record(dungeons.active) ||
          dungeons.active.id !== dungeon.id ||
          dungeons.active.wave !== b.wave ||
          !integer(b.wave, 2) ||
          b.enemyId !== `dungeon-${dungeon.id}-${b.wave}` ||
          b.enemyStage !== dungeon.minStage ||
          b.secretId !== undefined ||
          b.enraged
        : b.dungeonId !== undefined || b.wave !== undefined) ||
      (b.kind === 'boss'
        ? !secret ||
          secret.boss.id !== b.enemyId ||
          b.enemyStage !== secret.minStage ||
          !(encounters.discoveredSecrets as string[]).includes(secret.id) ||
          (encounters.defeatedBosses as string[]).includes(b.enemyId as string)
        : b.secretId !== undefined || b.enraged)
    )
      return invalid();
  }
  if ((dungeons.active !== null) !== (record(v.battle) && v.battle.kind === 'dungeon'))
    return invalid();
  const s = v as unknown as GameState;
  collectTitles(s);
  s.hp = Math.min(s.hp, stats(s).maxHp);
  s.lastTick = Math.min(s.lastTick, Date.now());
  return s;
}

export function loadGame(): { state: GameState; warning?: string } {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return { state: raw ? decodeSave(raw) : initialState() };
  } catch {
    return {
      state: initialState(),
      warning:
        'Không đọc được bản lưu. Bản cũ được giữ nguyên; hãy xuất bản lưu lỗi trước khi bắt đầu lại.',
    };
  }
}
