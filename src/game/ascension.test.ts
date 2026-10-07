import { describe, expect, it } from 'vitest';
import { initialState, perform, stats } from './engine';
import { decodeSave } from './storage';
import {
  ADVENTURE_CONTENT_COUNT,
  ADVENTURE_MAPS,
  ADVENTURE_NPCS,
  ADVENTURE_QUESTS,
  PETS,
  TALISMANS,
} from './ascension';
import { MAPS, NPCS, QUESTS } from './data';
import { DUNGEONS, MANUALS } from './expansion';
import { ENEMIES } from './encounters';
describe('Động Thiên expansion', () => {
  it('adds over fifty playable catalog entries and connects maps, enemies, NPCs and quest stories', () => {
    expect(ADVENTURE_CONTENT_COUNT).toBe(95);
    expect(new Set(MAPS.map((m) => m.id)).size).toBe(MAPS.length);
    for (const m of ADVENTURE_MAPS) {
      expect(MAPS).toContain(m);
      expect(ENEMIES.filter((e) => e.mapId === m.id).length).toBeGreaterThanOrEqual(5);
    }
    for (const n of ADVENTURE_NPCS) expect(NPCS).toContain(n);
    for (const q of ADVENTURE_QUESTS) expect(QUESTS).toContain(q);
    expect(MANUALS.filter((m) => m.id.startsWith('dao-manual-'))).toHaveLength(8);
    expect(DUNGEONS.filter((d) => d.id.startsWith('dao-dungeon-'))).toHaveLength(6);
  });
  it('migrates older saves without resetting their progress and rejects malformed adventure data', () => {
    const old: any = initialState();
    delete old.adventure;
    old.stones = 934;
    const next = decodeSave(JSON.stringify(old));
    expect(next.stones).toBe(934);
    expect(next.adventure.plots).toBe(3);
    for (const corrupt of [
      { plots: 20 },
      { materials: { unknown: 3 } },
      { pets: { fox: { level: 50, bond: 0 } } },
      { garden: [{ plot: 0, seed: 'unknown', plantedAt: 0, readyAt: 1 }] },
    ])
      expect(() =>
        decodeSave(JSON.stringify({ ...next, adventure: { ...next.adventure, ...corrupt } })),
      ).toThrow();
  });
  it('grows crops offline, prevents early/duplicate harvest and crafts useful timed talismans', () => {
    const now = 1700000000000;
    let s = initialState(now);
    const run = (action: Parameters<typeof perform>[1], time = now) => {
      const r = perform(s, action, () => 0.5, time);
      if (r.ok) s = r.state;
      return r;
    };
    expect(run({ type: 'plant', id: 'moonleaf', plot: 0 }).ok).toBe(true);
    expect(run({ type: 'harvest', plot: 0 }).ok).toBe(false);
    expect(run({ type: 'start-expedition', id: 'quay' }).ok).toBe(true);
    expect(run({ type: 'collect-expedition' }).ok).toBe(false);
    expect(run({ type: 'harvest', plot: 0 }, now + 200000).ok).toBe(true);
    expect(run({ type: 'harvest', plot: 0 }, now + 200000).ok).toBe(false);
    expect(run({ type: 'collect-expedition' }, now + 200000).ok).toBe(true);
    expect(run({ type: 'collect-expedition' }, now + 200000).ok).toBe(false);
    expect(run({ type: 'craft-talisman', id: 'guard' }, now + 200000).ok).toBe(true);
    const before = stats(s).defense;
    expect(run({ type: 'use-talisman', id: 'guard' }, now + 200000).ok).toBe(true);
    expect(stats(s).defense).toBeGreaterThan(before);
    expect(run({ type: 'use-talisman', id: 'guard' }, now + 200000).ok).toBe(false);
    expect(run({ type: 'tick', now: now + 900000 }, now + 900000).ok).toBe(true);
    expect(stats(s).defense).toBe(before);
    expect(() => decodeSave(JSON.stringify(s))).not.toThrow();
  });
  it('enforces pet contracts, realm requirements, feeding costs and actual combat/cultivation bonuses', () => {
    let s = initialState();
    const old = stats(s).cultivation;
    expect(perform(s, { type: 'adopt-pet', id: 'phoenix' }).ok).toBe(false);
    for (const id of ['__proto__', 'constructor', 'unknown']) {
      expect(perform(s, { type: 'activate-pet', id }).ok).toBe(false);
      expect(perform(s, { type: 'feed-pet', id }).ok).toBe(false);
    }
    s = perform(s, { type: 'adopt-pet', id: 'fox' }).state;
    expect(stats(s).cultivation).toBeGreaterThan(old);
    expect(perform(s, { type: 'adopt-pet', id: 'fox' }).ok).toBe(false);
    s = perform(s, { type: 'feed-pet', id: 'fox' }).state;
    expect(s.adventure.pets.fox.bond).toBe(20);
    expect(s.inventory.herb).toBe(5);
    expect(s.inventory.pill).toBe(2);
    expect(PETS).toHaveLength(12);
    expect(TALISMANS).toHaveLength(12);
  });
});
