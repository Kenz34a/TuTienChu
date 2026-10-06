import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initialState, perform, stats } from './engine';
import { decodeSave } from './storage';
import { MAPS, NPCS, SECTS, QUESTS } from './data';
import { MANUALS, DUNGEONS, qiCost, SPIRITUAL_ROOTS, INHERITANCES } from './expansion';
import { fingerprint } from '../cloud/client';
import type { Action, GameState } from './types';
const now = Date.UTC(2026, 9, 7, 8);
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now + 12 * 3600000);
});
afterEach(() => vi.useRealTimers());
const act = (s: GameState, a: Action, t = now) => perform(s, a, () => 0.5, t);
const tick = (s: GameState, seconds: number) =>
  act(s, { type: 'tick', now: now + seconds * 1000 }, now + seconds * 1000).state;

describe('extended cultivation, content and backward compatibility', () => {
  it('awakens roots only once and consumes actual resources when purifying', () => {
    let s = initialState(now);
    s = perform(s, { type: 'awaken-root' }, () => 0.995, now).state;
    expect(s.spiritualRoot!.id).toBe('heaven');
    expect(act(s, { type: 'awaken-root' }).ok).toBe(false);
    const old = stats(s).cultivation;
    s.lingqi = 20;
    s.inventory.essence = 2;
    s = act(s, { type: 'purify-root' }).state;
    expect(s.spiritualRoot!.level).toBe(2);
    expect(s.lingqi).toBe(0);
    expect(stats(s).cultivation).toBeGreaterThan(old);
    expect(SPIRITUAL_ROOTS).toHaveLength(10);
    expect(INHERITANCES).toHaveLength(9);
  });
  it('requires discovery, training and mastery to receive a one-time inheritance', () => {
    let s = initialState(now);
    s.lingqi = 100;
    s.manuals.breath = 3;
    s.training.totalSeconds = 900;
    expect(act(s, { type: 'inherit', id: 'cloud-legacy' }).ok).toBe(false);
    s.npcMet.push('elder');
    const old = stats(s).cultivation;
    s = act(s, { type: 'inherit', id: 'cloud-legacy' }).state;
    expect(s.inheritances).toEqual(['cloud-legacy']);
    expect(s.lingqi).toBe(40);
    expect(s.manuals.breath).toBe(4);
    expect(stats(s).cultivation).toBeGreaterThan(old);
    expect(act(s, { type: 'inherit', id: 'cloud-legacy' }).ok).toBe(false);
    expect(decodeSave(JSON.stringify(s)).inheritances).toEqual(s.inheritances);
  });
  it('transforms an awakened root through the final ancient legacy without losing its level', () => {
    let s = initialState(now);
    s.stage = 57;
    s.lingqi = 2500;
    s.wallet.divine = 3;
    s.spiritualRoot = { id: 'wood', level: 7 };
    s.encounters.discoveredSecrets = ['divine-secret'];
    s.encounters.defeatedBosses = ['boss-divine'];
    s.dungeons.clears.origintrial = 1;
    s = act(s, { type: 'inherit', id: 'origin-legacy' }).state;
    expect(s.spiritualRoot).toEqual({ id: 'chaos', level: 7 });
    expect(() => decodeSave(JSON.stringify(s))).not.toThrow();
  });
  it('exchanges currencies without arbitrage and awards high-world loot in the proper currency', () => {
    let s = initialState(now);
    s.stones = 1000;
    s = act(s, { type: 'exchange-currency', from: 'spirit', direction: 'up' }).state;
    expect(s.stones).toBe(0);
    expect(s.wallet.immortal).toBe(1);
    s = act(s, { type: 'exchange-currency', from: 'immortal', direction: 'down' }).state;
    expect(s.stones).toBe(1000);
    expect(s.wallet.immortal).toBe(0);
    expect(act(s, { type: 'exchange-currency', from: 'divine', direction: 'up' }).ok).toBe(false);
    s.stage = 48;
    s.hp = stats(s).maxHp;
    s = perform(s, { type: 'explore', mapId: 'stars' }, () => 0.9, now).state;
    expect(s.wallet.divine).toBeGreaterThan(0);
    expect(s.wallet.immortal).toBe(0);
    expect(() =>
      decodeSave(JSON.stringify({ ...s, wallet: { immortal: -1, divine: 0 } })),
    ).toThrow();
  });
  it('preserves wallet and save invariants when an exchange would overflow', () => {
    const s = initialState(now);
    s.stones = 1e9;
    s.wallet = { immortal: 1e9, divine: 1e9 };
    for (const [from, direction] of [
      ['spirit', 'up'],
      ['immortal', 'up'],
      ['immortal', 'down'],
      ['divine', 'down'],
    ] as const) {
      const result = act(s, { type: 'exchange-currency', from, direction });
      expect(result.ok).toBe(false);
      expect(result.state.wallet).toEqual(s.wallet);
      expect(result.state.stones).toBe(s.stones);
      expect(() => decodeSave(JSON.stringify(result.state))).not.toThrow();
    }
  });
  it('has nine distinct maps per world, fifteen manuals, nine sects, twenty NPCs and new quests', () => {
    for (const world of ['earth', 'immortal', 'divine'])
      expect(MAPS.filter((m) => m.world === world)).toHaveLength(9);
    for (const content of [MAPS, MANUALS, SECTS, NPCS, QUESTS, DUNGEONS])
      expect(new Set(content.map((c) => c.id)).size).toBe(content.length);
    expect(MANUALS).toHaveLength(15);
    expect(SECTS).toHaveLength(9);
    expect(NPCS).toHaveLength(20);
    expect(QUESTS.length).toBeGreaterThan(60);
  });
  it('preserves minute fractions across reload/stop, and rapid start/stop never creates XP or quest credits', () => {
    let s = initialState(now);
    for (let i = 0; i < 30; i++) {
      s = act(s, { type: 'meditate' }).state;
      s = act(s, { type: 'stop-training' }).state;
    }
    expect(s.xp).toBe(28);
    expect(s.metrics.meditations).toBe(0);
    s = act(s, { type: 'meditate' }).state;
    s = tick(s, 30);
    s = decodeSave(JSON.stringify(s));
    expect(s.training.remainder).toBe(30);
    expect(s.xp).toBe(28);
    s = tick(s, 60);
    expect(s.metrics.meditations).toBe(1);
    expect(s.training.remainder).toBe(0);
    expect(s.lingqi).toBe(7);
    const passive = tick(s, 61);
    expect(fingerprint(passive)).toBe(fingerprint(s));
  });
  it('caps a long absence at two hours without draining naturally recovering stamina', () => {
    let s = act(initialState(now), { type: 'meditate' }).state;
    s = tick(s, 10 * 3600);
    expect(s.metrics.meditations).toBe(120);
    expect(s.training.totalSeconds).toBe(7200);
    expect(s.stamina).toBe(100);
    expect(tick(s, 10 * 3600).metrics.meditations).toBe(120);
  });
  it('incense gives identical XP and qi whether time advances in seconds or in one batch', () => {
    let s = act(initialState(now), { type: 'incense' }).state;
    s = act(s, { type: 'meditate' }).state;
    const batched = tick(s, 360);
    for (let i = 1; i <= 360; i++) s = tick(s, i);
    expect(s.xp).toBeCloseTo(batched.xp, 8);
    expect(s.lingqi).toBe(batched.lingqi);
    expect(s.metrics.meditations).toBe(6);
  });
  it('requires meditation qi for breakthroughs even with enough XP and stones', () => {
    const s = initialState(now);
    s.xp = 100;
    s.stones = 100;
    expect(act(s, { type: 'breakthrough' }).ok).toBe(false);
    s.lingqi = qiCost(0);
    const next = act(s, { type: 'breakthrough' });
    expect(next.ok).toBe(true);
    expect(next.state.lingqi).toBe(0);
  });
  it('learns, upgrades and equips at most three manuals with actual combat bonuses', () => {
    let s = initialState(now);
    s.stage = 20;
    s.stones = 100000;
    s.lingqi = 100000;
    const oldAttack = stats(s).attack;
    for (const id of ['iron', 'windblade', 'jade']) s = act(s, { type: 'study', id }).state;
    s = act(s, { type: 'activate-manual', id: 'windblade' }).state;
    expect(stats(s).attack).toBeGreaterThan(oldAttack);
    s = act(s, { type: 'activate-manual', id: 'iron' }).state;
    expect(act(s, { type: 'activate-manual', id: 'jade' }).ok).toBe(false);
    s = act(s, { type: 'activate-manual', id: 'breath' }).state;
    expect(act(s, { type: 'activate-manual', id: 'jade' }).ok).toBe(true);
    expect(decodeSave(JSON.stringify(s)).manuals).toEqual(s.manuals);
  });
  it('founds a sect, funds upgrades, recruits NPCs and keeps its estate when leaving', () => {
    let s = initialState(now);
    s.stage = 3;
    s.stones = 10000;
    s.inventory.ore = 100;
    s = act(s, { type: 'found-sect', name: 'Thiên Trúc Tông' }).state;
    expect(s.sect).toBe('custom');
    const hp = stats(s).maxHp;
    expect(act(s, { type: 'sect-build', building: 'training' }).ok).toBe(false);
    for (let i = 0; i < 12; i++) s = act(s, { type: 'donate' }).state;
    s = act(s, { type: 'sect-build', building: 'hall' }).state;
    expect(s.customSect!.level).toBe(2);
    expect(stats(s).maxHp).toBeGreaterThan(hp);
    s = act(s, { type: 'recruit' }).state;
    expect(s.customSect!.members).toBe(2);
    s = act(s, { type: 'leave-sect' }).state;
    expect(s.sect).toBeNull();
    expect(s.customSect!.level).toBe(2);
    s = act(s, { type: 'join', sectId: 'custom' }).state;
    expect(s.sect).toBe('custom');
    expect(decodeSave(JSON.stringify(s)).customSect).toEqual(s.customSect);
  });
  it('runs three dungeon waves, survives reload, rewards once and applies entry cooldown', () => {
    let s = initialState(now);
    s.stage = 9;
    s.hp = stats(s).maxHp;
    s.inventory.pill = 20;
    s = act(s, { type: 'dungeon', id: 'trial' }).state;
    expect(s.battle!.wave).toBe(0);
    for (let wave = 0; wave < 3; wave++) {
      s = decodeSave(JSON.stringify(s));
      expect(s.battle!.wave).toBe(wave);
      s.battle!.hp = 1;
      s = act(s, { type: 'fight', move: 'attack' }).state;
    }
    expect(s.battle).toBeNull();
    expect(s.dungeons.active).toBeNull();
    expect(s.dungeons.clears.trial).toBe(1);
    expect(s.lingqi).toBe(30);
    expect(act(s, { type: 'fight', move: 'attack' }).ok).toBe(false);
    expect(act(s, { type: 'dungeon', id: 'trial' }).ok).toBe(false);
    expect(act(s, { type: 'dungeon', id: 'trial' }, now + 30 * 60000).ok).toBe(true);
  });
  it('retreat/death closes the active dungeon and retains cooldown', () => {
    let s = act(initialState(now), { type: 'dungeon', id: 'trial' }).state;
    const fled = act(s, { type: 'fight', move: 'flee' }).state;
    expect(fled.dungeons.active).toBeNull();
    expect(fled.dungeons.cooldowns.trial).toBeGreaterThan(now);
    s.hp = 1;
    s.battle!.hp = 1000;
    s.battle!.attack = 10000;
    s = act(s, { type: 'fight', move: 'guard' }).state;
    expect(s.dungeons.active).toBeNull();
    expect(s.dungeons.clears.trial).toBeUndefined();
    expect(() => decodeSave(JSON.stringify(s))).not.toThrow();
  });
  it('migrates old v1 saves and rejects malformed new progression/battle contexts', () => {
    const old: any = initialState(now);
    old.stage = 12;
    old.stones = 4321;
    for (const key of [
      'lingqi',
      'training',
      'manuals',
      'activeManuals',
      'customSect',
      'dungeons',
      'worldBossClaims',
      'wallet',
      'titles',
      'spiritualRoot',
      'inheritances',
    ])
      delete old[key];
    const restored = decodeSave(JSON.stringify(old));
    expect(restored.stage).toBe(12);
    expect(restored.stones).toBe(4321);
    expect(restored.training.active).toBe(false);
    for (const patch of [
      { lingqi: -1 },
      { manuals: { unknown: 1 } },
      { training: { active: true, remainder: 70, totalSeconds: 0 } },
      { activeManuals: ['breath', 'breath'] },
      { sect: 'custom' },
    ])
      expect(() => decodeSave(JSON.stringify({ ...restored, ...patch }))).toThrow();
    const battle = act(initialState(now), { type: 'dungeon', id: 'trial' }).state;
    battle.battle!.wave = 2;
    expect(() => decodeSave(JSON.stringify(battle))).toThrow();
  });
});
