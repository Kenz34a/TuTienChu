import { describe, expect, it } from 'vitest';
import { initialState, perform, stats } from './engine';
import { decodeSave } from './storage';
import { TITLES, collectTitles, equippedTitle } from './titles';
import { breakthroughRequirements } from './progression';
import { MAPS, NPCS, stoneCost, xpNeeded } from './data';
import { DUNGEONS, INHERITANCES, MANUALS, qiCost } from './expansion';
import { SECRET_AREAS } from './encounters';
import { fingerprint } from '../cloud/client';
import { REALM_METHODS } from './realmMethods';
const now = Date.now();

describe('Kim Dan progression and title system', () => {
  it('offers distinct methods for all twenty realms and consumes optional aids exactly once', () => {
    expect(REALM_METHODS).toHaveLength(20);
    expect(new Set(REALM_METHODS.map((m) => m.name)).size).toBe(20);
    const s = initialState(now);
    s.stage = 8;
    s.xp = xpNeeded(8);
    s.inventory.elixir = 1;
    s.lingqi = Math.ceil(qiCost(8) * 0.8);
    s.stones = stoneCost(8);
    const pill = perform(s, { type: 'breakthrough', method: 'pill' }, Math.random, now);
    expect(pill.ok).toBe(true);
    expect(pill.state.inventory.elixir).toBe(0);
    expect(pill.state.lingqi).toBe(0);
    s.inventory.elixir = 0;
    expect(perform(s, { type: 'breakthrough', method: 'pill' }, Math.random, now).ok).toBe(false);
    s.lingqi = qiCost(8);
    s.stones = Math.ceil(stoneCost(8) * 0.8);
    s.inventory.essence = 1;
    const array = perform(s, { type: 'breakthrough', method: 'array' }, Math.random, now);
    expect(array.ok).toBe(true);
    expect(array.state.inventory.essence).toBe(0);
    expect(array.state.stones).toBe(0);
  });
  it.each([8, 9, 10, 11])(
    'can meditate and break through Kim Dan stage %i without immortal/divine stones',
    (stage) => {
      let s = initialState(now);
      s.stage = stage;
      s.xp = xpNeeded(stage);
      s.stones = stoneCost(stage);
      const blocked = breakthroughRequirements(s);
      expect(blocked.resources.filter((r) => r.missing).map((r) => r.id)).toEqual(['qi']);
      expect(perform(s, { type: 'breakthrough' }, Math.random, now).message).toContain('linh khí');
      expect(perform(s, { type: 'breakthrough' }, Math.random, now).state).toBe(s);
      s = perform(s, { type: 'meditate' }, Math.random, now).state;
      s = perform(s, { type: 'tick', now: now + 360000 }, Math.random, now + 360000).state;
      expect(breakthroughRequirements(s).ready).toBe(true);
      const qi = s.lingqi;
      const next = perform(s, { type: 'breakthrough' }, Math.random, now + 360000);
      expect(next.ok).toBe(true);
      expect(next.state.stage).toBe(stage + 1);
      expect(next.state.lingqi).toBe(qi - qiCost(stage));
      expect(next.state.stones).toBe(0);
      expect(next.state.wallet).toEqual({ immortal: 0, divine: 0 });
      expect(() => decodeSave(JSON.stringify(next.state))).not.toThrow();
    },
  );
  it('reports every missing resource and includes spirit stones in readiness', () => {
    const s = initialState(now);
    s.stage = 8;
    s.xp = xpNeeded(8);
    s.lingqi = qiCost(8);
    s.stones = stoneCost(8) - 7;
    expect(breakthroughRequirements(s).ready).toBe(false);
    expect(breakthroughRequirements(s).message).toContain('7 linh thạch');
    s.stage = 36;
    s.xp = xpNeeded(36);
    s.stones = stoneCost(36);
    s.lingqi = qiCost(36);
    expect(breakthroughRequirements(s).message).toContain('3 tiên thạch');
  });
  it('has exactly fifty unique titles covering all five rarities and six visual effects', () => {
    expect(TITLES).toHaveLength(50);
    expect(new Set(TITLES.map((t) => t.id)).size).toBe(50);
    expect(new Set(TITLES.map((t) => t.name)).size).toBe(50);
    expect(new Set(TITLES.map((t) => t.rarity)).size).toBe(5);
    expect(new Set(TITLES.map((t) => t.effect)).size).toBe(6);
  });
  it('unlocks from accomplishments and preserves earned titles after spending resources', () => {
    let s = initialState(now);
    s.wallet.divine = 100;
    s = perform(s, { type: 'tick', now }, Math.random, now).state;
    expect(s.titles.owned).toEqual(['divine-wealth']);
    s.wallet.divine = 0;
    const next = perform(s, { type: 'equip-title', id: 'divine-wealth' }, Math.random, now);
    expect(next.ok).toBe(true);
    expect(equippedTitle(next.state)?.name).toBe('Thần Tài Tam Giới');
    expect(
      perform(next.state, { type: 'tick', now }, Math.random, now).state.titles.owned,
    ).toHaveLength(1);
  });
  it('applies only the equipped bonus and disabling effects preserves its actual power', () => {
    let s = initialState(now);
    s.metrics.kills = 500;
    s.stage = 8;
    collectTitles(s);
    const base = stats(s);
    const oldXp = s.xp;
    const oldFingerprint = fingerprint(s);
    s = perform(s, { type: 'equip-title', id: 'kill-first' }, Math.random, now).state;
    expect(stats(s).attack).toBe(Math.round(base.attack * 1.03));
    expect(s.xp).toBe(oldXp);
    expect(fingerprint(s)).not.toBe(oldFingerprint);
    s = perform(s, { type: 'equip-title', id: 'kill-fivehundred' }, Math.random, now).state;
    expect(stats(s).attack).toBe(Math.round(base.attack * 1.1));
    const power = stats(s);
    s = perform(s, { type: 'title-effects', enabled: false }, Math.random, now).state;
    expect(stats(s)).toEqual(power);
    expect(decodeSave(JSON.stringify(s)).titles).toEqual(s.titles);
    s = perform(s, { type: 'equip-title', id: null }, Math.random, now).state;
    expect(stats(s)).toEqual(base);
  });
  it('cannot equip locked or unknown titles or change titles during combat', () => {
    let s = initialState(now);
    for (const id of ['realm-origin', 'not-a-title'])
      expect(perform(s, { type: 'equip-title', id }, Math.random, now).ok).toBe(false);
    s = perform(s, { type: 'dungeon', id: 'trial' }, Math.random, now).state;
    expect(s.battle).not.toBeNull();
    expect(perform(s, { type: 'equip-title', id: null }, Math.random, now).ok).toBe(false);
  });
  it('migrates an older Kim Dan save without resetting progression or equipping a free bonus', () => {
    const s = initialState(now);
    s.stage = 11;
    s.xp = xpNeeded(11);
    s.stones = 4321;
    const legacy = JSON.parse(JSON.stringify(s));
    delete legacy.titles;
    const restored = decodeSave(JSON.stringify(legacy));
    expect(restored.stage).toBe(11);
    expect(restored.xp).toBe(s.xp);
    expect(restored.stones).toBe(4321);
    expect(restored.titles.owned).toEqual(['realm-foundation', 'realm-golden']);
    expect(restored.titles.equipped).toBeNull();
    for (const titles of [
      { owned: ['unknown'], equipped: null, effects: true },
      { owned: [], equipped: 'realm-golden', effects: true },
      { owned: ['realm-golden', 'realm-golden'], equipped: null, effects: true },
      { owned: [], equipped: null, effects: 'yes' },
    ])
      expect(() => decodeSave(JSON.stringify({ ...s, titles }))).toThrow();
  });
  it('all fifty conditions can be reached and simultaneous unlock logs remain valid saves', () => {
    let s = initialState(now);
    s.stage = 79;
    s.metrics.kills = 500;
    s.metrics.explorations = 50;
    s.metrics.crafts = 50;
    s.encounters.eliteKills = 10;
    s.encounters.discoveredSecrets = SECRET_AREAS.map((a) => a.id);
    s.encounters.defeatedBosses = SECRET_AREAS.map((a) => a.boss.id);
    s.training.totalSeconds = 3600 * 60;
    s.explored = MAPS.map((m) => m.id);
    s.manuals = Object.fromEntries(MANUALS.map((m) => [m.id, 10]));
    s.spiritualRoot = { id: 'heaven', level: 10 };
    s.inheritances = INHERITANCES.map((i) => i.id);
    s.sect = 'cloud';
    s.contribution = 250;
    s.customSect = {
      name: 'Vạn Cổ Tông',
      level: 10,
      members: 1,
      treasury: 0,
      buildings: { hall: 10, training: 1, alchemy: 1 },
    };
    s.dungeons.clears = Object.fromEntries(DUNGEONS.map((d, i) => [d.id, i ? 1 : 2]));
    s.wallet.divine = 100;
    s.npcMet = NPCS.map((n) => n.id);
    s.worldBossClaims = 10;
    s = perform(s, { type: 'tick', now }, Math.random, now).state;
    expect(s.titles.owned).toHaveLength(50);
    expect(() => decodeSave(JSON.stringify(s))).not.toThrow();
  });
});
