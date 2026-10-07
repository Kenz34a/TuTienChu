import { describe, expect, it } from 'vitest';
import { initialState, perform, stats } from './engine';
import { decodeSave } from './storage';
import { realmName, xpNeeded, stoneCost, STAGES } from './data';
import { PHASE_COUNT, MAX_STAGE, legacyStage } from './stages';
import { qiCost } from './expansion';
import { SECRET_AREAS } from './encounters';
describe('four phases and legacy character migration', () => {
  it('preserves all sixty old realm names, phase identities, XP, resources and original breakthrough costs', () => {
    const phases = ['Sơ kỳ', 'Trung kỳ', 'Đỉnh phong'];
    for (let stage = 0; stage < 60; stage++) {
      const old = {
        ...initialState(),
        version: 1,
        stage,
        xp: Math.round(100 * 1.18 ** stage) * 1.5,
        lingqi: 20 + stage * 8,
        stones: 1234,
      };
      const s = decodeSave(JSON.stringify(old));
      expect(s.stage).toBe(legacyStage(stage));
      expect(s.version).toBe(2);
      expect(realmName(s.stage)).toContain(phases[stage % 3]);
      expect(xpNeeded(s.stage)).toBe(Math.round(100 * 1.18 ** stage));
      expect(stoneCost(s.stage)).toBe(Math.round(40 * 1.12 ** stage));
      expect(qiCost(s.stage)).toBe(20 + stage * 8);
      expect(s.xp).toBe(old.xp);
      expect(s.stones).toBe(1234);
      expect(decodeSave(JSON.stringify(s)).stage).toBe(s.stage);
    }
  });
  it('migrates an unfinished legacy hidden-boss battle without losing its turn or consumed key', () => {
    const state = initialState();
    state.stage = 8;
    state.hp = stats(state).maxHp;
    state.inventory.key = 1;
    state.encounters.discoveredSecrets = [SECRET_AREAS[0].id];
    const started = perform(state, { type: 'challenge', secretId: SECRET_AREAS[0].id }, () => 0.5);
    expect(started.ok).toBe(true);
    const old = {
      ...started.state,
      version: 1,
      stage: 6,
      battle: { ...started.state.battle, enemyStage: 6 },
    };
    const migrated = decodeSave(JSON.stringify(old));
    expect(migrated.stage).toBe(8);
    expect(migrated.battle).toEqual(started.state.battle);
    expect(migrated.inventory.key || 0).toBe(0);
  });
  it('passes through Sơ, Trung, Hậu, Đỉnh and ascends only after the fourth phase', () => {
    expect(STAGES).toEqual(['Sơ kỳ', 'Trung kỳ', 'Hậu kỳ', 'Đỉnh phong']);
    expect(PHASE_COUNT).toBe(4);
    expect(MAX_STAGE).toBe(79);
    let s = initialState();
    s.stage = 8;
    for (const phase of ['Trung kỳ', 'Hậu kỳ', 'Đỉnh phong', 'Sơ kỳ']) {
      const before = s.stage;
      s.xp = xpNeeded(before);
      s.lingqi = qiCost(before);
      s.stones = stoneCost(before);
      const r = perform(s, { type: 'breakthrough' });
      expect(r.ok).toBe(true);
      s = r.state;
      expect(realmName(s.stage)).toContain(phase);
      expect(realmName(s.stage)).toContain(s.stage < 12 ? 'Kim Đan' : 'Nguyên Anh');
    }
  });
});
