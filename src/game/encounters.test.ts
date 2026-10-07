import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAPS, xpNeeded } from './data';
import { ALL_ENEMIES, ENEMIES, SECRET_AREAS, enemyForMap, worldVisits } from './encounters';
import { initialState, perform, stats } from './engine';
import { decodeSave } from './storage';
import type { GameState } from './types';

const now = Date.UTC(2026, 9, 6, 12);
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});
afterEach(() => vi.useRealTimers());
const rng = (...values: number[]) => {
  let index = 0;
  return () => values[index++] ?? 0.5;
};
function bossReady(index = 0) {
  const s = initialState(now),
    area = SECRET_AREAS[index];
  s.stage = area.minStage + 3;
  s.hp = stats(s).maxHp;
  s.inventory.key = 2;
  s.inventory.pill = 8;
  s.encounters.discoveredSecrets = [area.id];
  return s;
}
function winBoss(s: GameState, index = 0) {
  s = perform(s, { type: 'challenge', secretId: SECRET_AREAS[index].id }, () => 0.5, now).state;
  expect(s.battle?.kind).toBe('boss');
  for (let i = 0; i < 60 && s.battle; i++) {
    const move =
      s.hp < stats(s).maxHp * 0.4 && (s.inventory.pill || 0) > 0
        ? 'pill'
        : s.battle.skillCooldown === 0
          ? 'skill'
          : 'attack';
    s = perform(s, { type: 'fight', move }, () => 0.5, now).state;
  }
  expect(s.encounters.defeatedBosses).toContain(SECRET_AREAS[index].boss.id);
  return s;
}

describe('Local monster populations', () => {
  it('has 5 normal and 3 elite species in every map across all 3 worlds', () => {
    expect(ENEMIES).toHaveLength(288);
    expect(ALL_ENEMIES).toHaveLength(336);
    expect(new Set(ALL_ENEMIES.map((enemy) => enemy.id)).size).toBe(336);
    for (const map of MAPS) {
      expect(
        ENEMIES.filter((enemy) => enemy.mapId === map.id && enemy.kind === 'normal'),
      ).toHaveLength(5);
      expect(
        ENEMIES.filter((enemy) => enemy.mapId === map.id && enemy.kind === 'elite'),
      ).toHaveLength(3);
    }
  });
  it('selects every species and observes the normal/elite boundary', () => {
    const rolls = [0, 0.17, 0.33, 0.49, 0.65, 0.8, 0.88, 0.96];
    for (const map of MAPS)
      expect(new Set(rolls.map((roll) => enemyForMap(map.id, roll).id)).size).toBe(8);
    expect(enemyForMap('bamboo', 0.7999).kind).toBe('normal');
    expect(enemyForMap('bamboo', 0.8).kind).toBe('elite');
  });
  it('elite encounters have stronger stats and increased real rewards', () => {
    const normal = perform(
      initialState(now),
      { type: 'explore', mapId: 'bamboo' },
      rng(0.1, 0.1),
      now,
    ).state;
    const elite = perform(
      initialState(now),
      { type: 'explore', mapId: 'bamboo' },
      rng(0.1, 0.9),
      now,
    ).state;
    expect(elite.battle!.kind).toBe('elite');
    expect(elite.battle!.maxHp).toBeGreaterThan(normal.battle!.maxHp);
    expect(elite.battle!.attack).toBeGreaterThan(normal.battle!.attack);
    expect(elite.encounters.seen).toContain(elite.battle!.enemyId);
    elite.battle!.hp = 1;
    const won = perform(elite, { type: 'fight', move: 'attack' }, () => 0.5, now).state;
    expect(won.stones).toBe(180 + 55);
    expect(won.xp).toBe(28 + Math.round(xpNeeded(0) * 0.08 * 2.2));
    expect(won.inventory.essence).toBe(3);
    expect(won.encounters.eliteKills).toBe(1);
  });
  it('elite fights can drop jade and extra gear', () => {
    const s = perform(
      initialState(now),
      { type: 'explore', mapId: 'bamboo' },
      rng(0.1, 0.9),
      now,
    ).state;
    s.battle!.hp = 1;
    const won = perform(s, { type: 'fight', move: 'attack' }, () => 0.1, now).state;
    expect(won.inventory.key).toBe(1);
    expect(won.bag).toHaveLength(3);
  });
});

describe('Hidden areas and boss combat', () => {
  it('discovers a secret after 5 successful explorations only in its own world', () => {
    let s = initialState(now);
    for (let i = 0; i < 4; i++)
      s = perform(s, { type: 'explore', mapId: 'bamboo' }, () => 0.9, now).state;
    expect(s.encounters.discoveredSecrets).toEqual([]);
    const fifth = perform(s, { type: 'explore', mapId: 'bamboo' }, () => 0.9, now);
    s = fifth.state;
    expect(s.encounters.discoveredSecrets).toEqual(['earth-secret']);
    expect(fifth.message).toContain('Vô Danh Cổ Động');
    expect(worldVisits(s, 'earth')).toBe(5);
    expect(worldVisits(s, 'immortal')).toBe(0);
    s.stamina = 0;
    expect(perform(s, { type: 'explore', mapId: 'bamboo' }).ok).toBe(false);
    expect(worldVisits(s, 'earth')).toBe(5);
  });
  it('encountering monsters also counts toward finding the secret', () => {
    let s = initialState(now);
    for (let i = 0; i < 5; i++) {
      s = perform(s, { type: 'explore', mapId: 'bamboo' }, rng(0.1, 0.1), now).state;
      s = perform(s, { type: 'fight', move: 'flee' }, () => 0.5, now).state;
    }
    expect(s.encounters.discoveredSecrets).toContain('earth-secret');
  });
  it('requires discovery, cultivation, jade, stamina and enough HP without consuming failed attempts', () => {
    for (const change of [
      (s: GameState) => {
        s.encounters.discoveredSecrets = [];
      },
      (s: GameState) => {
        s.stage = 0;
      },
      (s: GameState) => {
        s.inventory.key = 0;
      },
      (s: GameState) => {
        s.stamina = 15;
      },
      (s: GameState) => {
        s.hp = 1;
      },
    ]) {
      const s = bossReady();
      change(s);
      const original = structuredClone(s);
      expect(perform(s, { type: 'challenge', secretId: 'earth-secret' }).ok).toBe(false);
      expect(s).toEqual(original);
    }
  });
  it('charges jade and stamina at entry, and fleeing grants no boss rewards', () => {
    let s = perform(
      bossReady(),
      { type: 'challenge', secretId: 'earth-secret' },
      () => 0.5,
      now,
    ).state;
    expect(s.inventory.key).toBe(1);
    expect(s.stamina).toBe(84);
    expect(s.battle!.secretId).toBe('earth-secret');
    s = perform(s, { type: 'fight', move: 'flee' }, () => 0.5, now).state;
    expect(s.inventory.key).toBe(1);
    expect(s.encounters.defeatedBosses).toEqual([]);
  });
  it('bosses enrage exactly once at 35% HP and combat persists across a save', () => {
    let s = perform(
      bossReady(),
      { type: 'challenge', secretId: 'earth-secret' },
      () => 0.5,
      now,
    ).state;
    const base = s.battle!.attack;
    s.battle!.hp = Math.floor(s.battle!.maxHp * 0.3);
    s = perform(s, { type: 'fight', move: 'guard' }, () => 0.5, now).state;
    expect(s.battle!.enraged).toBe(true);
    expect(s.battle!.attack).toBe(Math.round(base * 1.3));
    s = decodeSave(JSON.stringify(s));
    s = perform(s, { type: 'fight', move: 'guard' }, () => 0.5, now).state;
    expect(s.battle!.attack).toBe(Math.round(base * 1.3));
  });
  it.each([0, 1, 2])(
    'boss in world %i is beatable with normal skill/potion actions and drops its one-time treasure',
    (index) => {
      const original = bossReady(index),
        won = winBoss(original, index);
      expect(won.inventory.essence).toBe(5);
      expect(won.inventory.elixir).toBe(2);
      expect(won.bag).toHaveLength(3);
      expect(won.bag.at(-1)!.rank).toBe([2, 6, 8][index]);
      expect(won.stones).toBeGreaterThan(original.stones);
      expect(won.metrics.kills).toBe(1);
      expect(perform(won, { type: 'challenge', secretId: SECRET_AREAS[index].id }).ok).toBe(false);
      expect(decodeSave(JSON.stringify(won)).encounters.defeatedBosses).toEqual(
        won.encounters.defeatedBosses,
      );
    },
  );
  it('converts guaranteed boss equipment into essence when the bag is full', () => {
    const s = bossReady();
    s.bag = Array.from({ length: 114 }, (_, i) => ({
      uid: `g${i + 2}`,
      slot: 'ring',
      rank: 0,
      level: 0,
    }));
    s.nextUid = 116;
    const won = winBoss(s);
    expect(won.bag).toHaveLength(114);
    expect(won.inventory.essence).toBe(8);
  });
});

describe('Save compatibility', () => {
  it('migrates an old save and a running old battle without losing progress', () => {
    const old = perform(
      initialState(now),
      { type: 'explore', mapId: 'bamboo' },
      rng(0.1, 0.1),
      now,
    ).state;
    const raw = JSON.parse(JSON.stringify(old));
    delete raw.encounters;
    for (const key of ['enemyId', 'kind', 'enemyStage', 'enraged']) delete raw.battle[key];
    const migrated = decodeSave(JSON.stringify(raw));
    expect(migrated.stones).toBe(old.stones);
    expect(migrated.stage).toBe(old.stage);
    expect(migrated.battle!.hp).toBe(old.battle!.hp);
    expect(migrated.battle!.kind).toBe('normal');
    expect(migrated.encounters.visits.bamboo).toBe(1);
    expect(perform(migrated, { type: 'fight', move: 'attack' }, () => 0.5, now).ok).toBe(true);
  });
  it.each([
    { visits: { invalid: 1 } },
    { visits: { bamboo: -1 } },
    { seen: ['unknown'] },
    { discoveredSecrets: ['invalid'] },
    { defeatedBosses: ['boss-earth'] },
    { eliteKills: -1 },
  ])('rejects malformed encounter data %j', (change) => {
    const s = initialState(now);
    Object.assign(s.encounters, change);
    expect(() => decodeSave(JSON.stringify(s))).toThrow();
  });
  it('rejects mismatched enemy identities and invalid secret battles', () => {
    const s = perform(
      bossReady(),
      { type: 'challenge', secretId: 'earth-secret' },
      () => 0.5,
      now,
    ).state;
    s.battle!.enemyId = 'bamboo-0';
    expect(() => decodeSave(JSON.stringify(s))).toThrow();
    s.battle!.enemyId = 'boss-earth';
    s.battle!.secretId = 'divine-secret';
    expect(() => decodeSave(JSON.stringify(s))).toThrow();
  });
});
