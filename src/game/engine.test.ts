import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAPS, QUESTS, REALMS, realmName, stoneCost, xpNeeded } from './data';
import { dayKey, initialState, perform, stats } from './engine';
import { decodeSave } from './storage';
import { qiCost } from './expansion';
import type { Action, GameState } from './types';

const now = Date.UTC(2026, 9, 6, 12);
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});
afterEach(() => vi.useRealTimers());
const run = (s: GameState, action: Action, random = 0.5) => perform(s, action, () => random, now);
const start = () => initialState(now);
function fight(s: GameState) {
  const next = run(s, { type: 'explore', mapId: 'bamboo' }, 0.3).state;
  expect(next.battle).not.toBeNull();
  return next;
}

describe('Cultivation and recovery', () => {
  it('has 20 realms, exactly 3 stages each', () => {
    expect(REALMS).toHaveLength(20);
    expect(realmName(0)).toBe('Luyện Khí Sơ kỳ');
    expect(realmName(59)).toBe('Thần Đế Đỉnh phong');
  });
  it('meditation starts without instant gains, awards a completed minute, and rejects repeated clicks', () => {
    const original = start();
    const started = run(original, { type: 'meditate' });
    expect(started.ok).toBe(true);
    expect(started.state.xp).toBe(28);
    expect(started.state.metrics.meditations).toBe(0);
    expect(run(started.state, { type: 'meditate' }).ok).toBe(false);
    const s = perform(
      started.state,
      { type: 'tick', now: now + 60000 },
      () => 0.5,
      now + 60000,
    ).state;
    expect(s.xp).toBeGreaterThan(28);
    expect(s.lingqi).toBeGreaterThan(0);
    expect(s.metrics.meditations).toBe(1);
    expect(s.daily.meditations).toBe(1);
    expect(original.xp).toBe(28);
    expect(original.metrics.meditations).toBe(0);
  });
  it('cannot meditate with insufficient stamina', () => {
    const s = start();
    s.stamina = 2;
    expect(run(s, { type: 'meditate' }).ok).toBe(false);
  });
  it('requires both experience and stones for a breakthrough', () => {
    const s = start();
    expect(run(s, { type: 'breakthrough' }).ok).toBe(false);
    s.xp = 100;
    s.stones = 0;
    expect(run(s, { type: 'breakthrough' }).ok).toBe(false);
  });
  it('progresses through all 59 breakthroughs and stops at the final stage', () => {
    let s = start();
    for (let stage = 0; stage < 59; stage++) {
      s.xp = xpNeeded(stage);
      s.stones = stoneCost(stage);
      s.lingqi = qiCost(stage);
      s.wallet = { immortal: 1000, divine: 1000 };
      const result = run(s, { type: 'breakthrough' });
      expect(result.ok).toBe(true);
      s = result.state;
      expect(s.stage).toBe(stage + 1);
      expect(s.xp).toBe(0);
      expect(s.stones).toBe(0);
      expect(s.hp).toBe(stats(s).maxHp);
    }
    expect(run(s, { type: 'breakthrough' }).ok).toBe(false);
    expect(s.metrics.breakthroughs).toBe(59);
  });
  it('rest requires money and restores finite stamina and HP', () => {
    const s = start();
    s.hp = 30;
    s.stamina = 12;
    const result = run(s, { type: 'rest' }).state;
    expect(result.stones).toBe(155);
    expect(result.stamina).toBe(37);
    expect(result.hp).toBe(90);
  });
  it('passive regeneration caps at max and never runs backwards', () => {
    const s = start();
    s.hp = 1;
    s.stamina = 1;
    const recovered = perform(
      s,
      { type: 'tick', now: now + 86400000 },
      () => 0.5,
      now + 86400000,
    ).state;
    expect(recovered.hp).toBe(stats(recovered).maxHp);
    expect(recovered.stamina).toBe(100);
    const backwards = run(s, { type: 'tick', now: now - 1000 }).state;
    expect(backwards.hp).toBe(1);
    expect(backwards.stamina).toBe(1);
  });
  it('incense costs once, expires, and grants only its active duration', () => {
    const s = run(start(), { type: 'incense' }).state;
    expect(s.stones).toBe(130);
    expect(run(s, { type: 'incense' }).ok).toBe(false);
    const next = perform(s, { type: 'tick', now: now + 3600000 }, () => 0.5, now + 3600000).state;
    expect(next.xp).toBe(28); // Incense amplifies meditation; it no longer generates instant/passive XP.
  });
});

describe('Exploration and battle', () => {
  it('locks locations by realm including immortal and divine worlds', () => {
    for (const map of MAPS.filter((m) => m.minStage > 0))
      expect(run(start(), { type: 'explore', mapId: map.id }).ok).toBe(false);
    const s = start();
    s.stage = 27;
    s.hp = stats(s).maxHp;
    expect(run(s, { type: 'explore', mapId: 'gate' }).ok).toBe(true);
    expect(run(s, { type: 'explore', mapId: 'stars' }).ok).toBe(false);
  });
  it('non-combat exploration provides actual loot and records unique visited maps', () => {
    const s = run(start(), { type: 'explore', mapId: 'bamboo' }, 0.9).state;
    expect(s.battle).toBeNull();
    expect(s.stones).toBe(198);
    expect(s.inventory.ore).toBe(6);
    expect(s.stamina).toBe(92);
    expect(s.explored).toEqual(['bamboo']);
    const again = run(s, { type: 'explore', mapId: 'bamboo' }, 0.9).state;
    expect(again.explored).toHaveLength(1);
    expect(again.metrics.explorations).toBe(2);
  });
  it('cannot explore without stamina or while critically injured', () => {
    const s = start();
    s.stamina = 7;
    expect(run(s, { type: 'explore', mapId: 'bamboo' }).ok).toBe(false);
    s.stamina = 100;
    s.hp = 1;
    expect(run(s, { type: 'explore', mapId: 'bamboo' }).ok).toBe(false);
  });
  it('blocks unrelated actions and free regeneration during combat', () => {
    const s = fight(start());
    expect(run(s, { type: 'meditate' }).ok).toBe(false);
    expect(run(s, { type: 'buy', item: 'pill' }).ok).toBe(false);
    s.hp = 40;
    const tick = perform(s, { type: 'tick', now: now + 60000 }, () => 0.5, now + 60000).state;
    expect(tick.hp).toBe(40);
    expect(tick.stamina).toBe(s.stamina);
  });
  it('victory grants loot once; the same battle cannot be claimed again', () => {
    let s = fight(start());
    for (let i = 0; s.battle && i < 20; i++) s = run(s, { type: 'fight', move: 'attack' }).state;
    expect(s.battle).toBeNull();
    expect(s.metrics.kills).toBe(1);
    expect(s.daily.kills).toBe(1);
    expect(s.stones).toBe(205);
    expect(s.xp).toBe(36);
    expect(run(s, { type: 'fight', move: 'attack' }).ok).toBe(false);
  });
  it('skill has a 3-turn cooldown and cannot be spammed', () => {
    const s = run(fight(start()), { type: 'fight', move: 'skill' }).state;
    expect(s.battle!.skillCooldown).toBe(3);
    expect(run(s, { type: 'fight', move: 'skill' }).ok).toBe(false);
    let next = s;
    for (let i = 0; i < 3; i++) next = run(next, { type: 'fight', move: 'guard' }).state;
    expect(next.battle!.skillCooldown).toBe(0);
    expect(run(next, { type: 'fight', move: 'skill' }).ok).toBe(true);
  });
  it('guard actually reduces incoming damage', () => {
    const s = fight(start());
    const guarded = run(s, { type: 'fight', move: 'guard' }).state;
    const attacked = run(s, { type: 'fight', move: 'attack' }).state;
    expect(guarded.hp).toBeGreaterThan(attacked.hp);
  });
  it('healing consumes a potion and an enemy turn', () => {
    const s = fight(start());
    s.hp = 40;
    const next = run(s, { type: 'fight', move: 'pill' }).state;
    expect(next.inventory.pill).toBe(2);
    expect(next.hp).toBeGreaterThan(40);
    expect(next.hp).toBeLessThan(100);
    expect(next.battle!.turn).toBe(1);
  });
  it('defeat loses 5% stones and revives; fleeing grants no kill rewards', () => {
    const s = fight(start());
    s.hp = 1;
    const defeated = run(s, { type: 'fight', move: 'guard' }).state;
    expect(defeated.battle).toBeNull();
    expect(defeated.stones).toBe(171);
    expect(defeated.hp).toBe(36);
    const fled = run(fight(start()), { type: 'fight', move: 'flee' }).state;
    expect(fled.battle).toBeNull();
    expect(fled.metrics.kills).toBe(0);
    expect(fled.stones).toBe(180);
  });
});

describe('Gear, economy, race, and sect', () => {
  it('equipping replaces old gear without duplication and changes stats', () => {
    const s = start(),
      before = stats(s).attack;
    const next = run(s, { type: 'equip', uid: 'g2' }).state;
    expect(next.bag.find((g) => g.uid === 'g2')).toBeUndefined();
    expect(next.equipped.ring!.uid).toBe('g2');
    expect(stats(next).attack).toBeGreaterThan(before);
    const back = run(next, { type: 'unequip', slot: 'ring' }).state;
    expect(back.bag.filter((g) => g.uid === 'g2')).toHaveLength(1);
    expect(back.equipped.ring).toBeUndefined();
  });
  it('upgrade consumes essence and currency and is capped at +10', () => {
    const s = start();
    s.stones = 10000;
    s.inventory.essence = 20;
    const next = run(s, { type: 'upgrade', slot: 'robe' }).state;
    expect(next.stones).toBe(9970);
    expect(next.inventory.essence).toBe(19);
    expect(next.equipped.robe!.level).toBe(1);
    next.equipped.robe!.level = 10;
    expect(run(next, { type: 'upgrade', slot: 'robe' }).ok).toBe(false);
  });
  it('salvage removes gear and returns rank-based essence once', () => {
    const s = run(start(), { type: 'salvage', uid: 'g2' }).state;
    expect(s.bag).toHaveLength(1);
    expect(s.inventory.essence).toBe(4);
    expect(run(s, { type: 'salvage', uid: 'g2' }).ok).toBe(false);
  });
  it('crafting subtracts ingredients and adds usable potions', () => {
    const s = run(start(), { type: 'craft', recipe: 'elixir' }).state;
    expect(s.inventory.herb).toBe(3);
    expect(s.inventory.elixir).toBe(1);
    expect(s.stones).toBe(145);
    expect(s.metrics.crafts).toBe(1);
    const used = run(s, { type: 'use', item: 'elixir' }).state;
    expect(used.xp).toBe(63);
    expect(used.inventory.elixir).toBe(0);
    expect(run(s, { type: 'craft', recipe: 'elixir' }).ok).toBe(false);
  });
  it('forges level-appropriate random equipment with unique IDs', () => {
    const s = start();
    s.stage = 30;
    const next = run(s, { type: 'craft', recipe: 'gear' }, 0.1).state;
    expect(next.bag.at(-1)!.rank).toBe(5);
    expect(next.bag.at(-1)!.uid).toBe('g4');
    expect(next.nextUid).toBe(5);
  });
  it('buy/sell have actual inventory changes and no money generation', () => {
    const bought = run(start(), { type: 'buy', item: 'herb' }).state;
    expect(bought.inventory.herb).toBe(9);
    expect(bought.stones).toBe(168);
    const sold = run(bought, { type: 'sell', item: 'herb' }).state;
    expect(sold.inventory.herb).toBe(8);
    expect(sold.stones).toBe(174);
    expect(run(start(), { type: 'sell', item: 'key' }).ok).toBe(false);
  });
  it('reserves material stacks and prevents full-bag gear creation without consuming ingredients', () => {
    const s = start();
    s.bag = Array.from({ length: 114 }, (_, i) => ({
      uid: `g${i + 2}`,
      slot: 'ring',
      rank: 0,
      level: 0,
    }));
    s.nextUid = 116;
    const full = run(s, { type: 'craft', recipe: 'gear' });
    expect(full.ok).toBe(false);
    expect(full.state.inventory.ore).toBe(4);
    expect(full.state.stones).toBe(180);
    const bought = run(s, { type: 'buy', item: 'elixir' });
    expect(bought.ok).toBe(true);
    expect(bought.state.inventory.elixir).toBe(1);
    expect(bought.state.bag).toHaveLength(114);
    expect(decodeSave(JSON.stringify(bought.state)).bag).toHaveLength(114);
  });
  it('chooses race once, applies bonuses, and trims profile names', () => {
    const s = run(start(), { type: 'profile', name: '  Mặc Vân  ', race: 'dragon' }).state;
    expect(s.name).toBe('Mặc Vân');
    expect(s.race).toBe('dragon');
    expect(s.raceChosen).toBe(true);
    expect(stats(s).maxHp).toBeGreaterThan(stats(start()).maxHp);
    expect(run(s, { type: 'profile', name: 'Vân', race: 'fox' }).state.race).toBe('dragon');
    expect(run(s, { type: 'profile', name: ' ' }).ok).toBe(false);
  });
  it('sect bonus is active, cannot join twice, and donations pay rewards', () => {
    let s = run(start(), { type: 'join', sectId: 'cloud' }).state;
    expect(stats(s).cultivation).toBeCloseTo(1.38 * 1.05);
    expect(run(s, { type: 'join', sectId: 'sword' }).ok).toBe(false);
    for (let i = 0; i < 3; i++) s = run(s, { type: 'donate' }).state;
    expect(s.contribution).toBe(75);
    expect(s.stones).toBe(30);
    expect(s.inventory.elixir).toBe(1);
  });
});

describe('Quests, NPCs, and save validation', () => {
  it('quest reward requires completion and can only be claimed once', () => {
    let s = start();
    expect(run(s, { type: 'quest', id: 'first' }).ok).toBe(false);
    s = run(s, { type: 'meditate' }).state;
    s = perform(s, { type: 'tick', now: now + 180000 }, () => 0.5, now + 180000).state;
    const reward = run(s, { type: 'quest', id: 'first' }).state;
    expect(reward.stones).toBe(s.stones + 60);
    expect(reward.claimed).toContain('first');
    expect(run(reward, { type: 'quest', id: 'first' }).ok).toBe(false);
  });
  it('hidden quests reveal after talking to the actual NPC', () => {
    let s = start();
    s.metrics.meditations = 10;
    expect(run(s, { type: 'quest', id: 'hidden-elder' }).ok).toBe(false);
    s = run(s, { type: 'npc', npcId: 'elder', choice: 'talk' }).state;
    expect(QUESTS.find((q) => q.id === 'hidden-elder')!.reveal!(s)).toBe(true);
    s = run(s, { type: 'quest', id: 'hidden-elder' }).state;
    expect(s.inventory.key).toBe(1);
    expect(s.claimed).toContain('hidden-elder');
  });
  it('NPC trade consumes gifts and does not work without material', () => {
    const s = run(start(), { type: 'npc', npcId: 'elder', choice: 'gift' }).state;
    expect(s.inventory.herb).toBe(7);
    expect(s.inventory.elixir).toBe(1);
    s.inventory.herb = 0;
    expect(run(s, { type: 'npc', npcId: 'elder', choice: 'gift' }).ok).toBe(false);
  });
  it('daily rewards reset at midnight in Vietnam without resetting main quests', () => {
    const t = Date.UTC(2026, 9, 6, 16, 59),
      s = initialState(t);
    s.daily.meditations = 5;
    s.claimed = ['first'];
    const claimed = perform(s, { type: 'quest', id: 'daily-cultivate' }, () => 0.5, t).state;
    expect(claimed.daily.claimed).toContain('daily-cultivate');
    const next = perform(claimed, { type: 'tick', now: t + 60000 }, () => 0.5, t + 60000).state;
    expect(next.daily.date).toBe('2026-10-07');
    expect(next.daily.meditations).toBe(0);
    expect(next.daily.claimed).toEqual([]);
    expect(next.claimed).toEqual(['first']);
    expect(dayKey(t)).toBe('2026-10-06');
  });
  it('round trips normal progress and a live battle', () => {
    expect(decodeSave(JSON.stringify(start()))).toEqual(start());
    const s = fight(start());
    expect(decodeSave(JSON.stringify(s)).battle).toEqual(s.battle);
  });
  it.each([
    { stage: 60 },
    { stage: -1 },
    { xp: -3 },
    { race: 'unknown' },
    { inventory: { money: 1 } },
    { bag: [{ uid: 'g2', slot: 'ring', rank: 99, level: 0 }] },
    { metrics: {} },
    { claimed: ['fake'] },
    { stamina: 200 },
    { daily: { date: 'x' } },
    { battle: { hp: 1 } },
    { nextUid: 2 },
  ])('rejects malformed imported saves: %j', (override) => {
    expect(() => decodeSave(JSON.stringify({ ...start(), ...override }))).toThrow();
  });
  it('rejects duplicate gear IDs and incompatible save versions', () => {
    const s = start();
    s.bag.push(s.bag[0]);
    expect(() => decodeSave(JSON.stringify(s))).toThrow();
    expect(() => decodeSave('{"version":2}')).toThrow();
    expect(() => decodeSave('not-json')).toThrow();
  });
});
