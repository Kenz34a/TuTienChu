import {
  ITEMS,
  MAPS,
  NPCS,
  QUESTS,
  RACES,
  REALMS,
  SECTS,
  SLOTS,
  questClaimed,
  realmName,
  stoneCost,
  xpNeeded,
} from './data';
import type { Action, GameState, Gear, ItemId, Result, Stats } from './types';
import {
  ALL_ENEMIES,
  KIND_LABELS,
  SECRET_AREAS,
  enemyForMap,
  worldVisits,
  type Enemy,
} from './encounters';

export const dayKey = (now = Date.now()) =>
  new Date(now).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
export function initialState(now = Date.now()): GameState {
  return {
    version: 1,
    name: 'Vô Danh',
    race: 'human',
    raceChosen: false,
    stage: 0,
    xp: 28,
    stones: 180,
    hp: 120,
    stamina: 100,
    lastTick: now,
    inventory: { herb: 8, ore: 4, pill: 3, essence: 2 },
    bag: [
      { uid: 'g2', slot: 'ring', rank: 1, level: 0 },
      { uid: 'g3', slot: 'boots', rank: 0, level: 0 },
    ],
    equipped: { robe: { uid: 'g1', slot: 'robe', rank: 0, level: 0 } },
    metrics: {
      meditations: 0,
      kills: 0,
      breakthroughs: 0,
      explorations: 0,
      crafts: 0,
      donations: 0,
      trades: 0,
    },
    explored: [],
    encounters: { visits: {}, seen: [], eliteKills: 0, discoveredSecrets: [], defeatedBosses: [] },
    npcMet: [],
    claimed: [],
    daily: { date: dayKey(now), meditations: 0, kills: 0, claimed: [] },
    sect: null,
    contribution: 0,
    battle: null,
    nextUid: 4,
    incenseUntil: 0,
    events: [
      {
        id: 1,
        text: 'Bạn tỉnh dậy dưới chân Thanh Vân Sơn. Một cuốn đạo thư cũ nằm bên cạnh. Tiên lộ của bạn bắt đầu từ đây.',
        type: 'story',
        time: now,
      },
    ],
  };
}

export const gearPower = (g: Gear) => Math.round(5 * Math.pow(2.05, g.rank) * (1 + 0.16 * g.level));
export function stats(s: GameState): Stats {
  const growth = Math.pow(1.15, s.stage);
  let maxHp = 110 * growth,
    attack = 18 * growth,
    defense = 5 * growth;
  for (const gear of Object.values(s.equipped)) {
    if (!gear) continue;
    const power = gearPower(gear);
    if (['robe', 'hat', 'pants'].includes(gear.slot)) {
      maxHp += power * 2;
      defense += power * 0.6;
    } else if (['ring', 'gloves'].includes(gear.slot)) attack += power;
    else {
      defense += power * 0.3;
      maxHp += power;
      attack += power * 0.3;
    }
  }
  if (s.race === 'dragon') {
    maxHp *= 1.25;
    defense *= 1.1;
  }
  if (s.race === 'spirit') maxHp *= 0.9;
  if (s.race === 'ancient') attack *= 1.2;
  if (s.sect === 'sword') attack *= 1.15;
  if (s.sect === 'lotus') maxHp *= 1.2;
  return {
    maxHp: Math.round(maxHp),
    attack: Math.round(attack),
    defense: Math.round(defense),
    cultivation:
      (s.race === 'human' ? 1.15 : s.race === 'spirit' ? 1.25 : 1) * (s.sect === 'cloud' ? 1.2 : 1),
    crit: s.race === 'fox' ? 0.25 : 0.1,
  };
}
// Six permanent stack slots prevent material rewards from overflowing a full gear bag.
export const bagUsed = (s: GameState) => s.bag.length + Object.keys(ITEMS).length;
const addItem = (s: GameState, id: ItemId, amount = 1) => {
  s.inventory[id] = (s.inventory[id] || 0) + amount;
};
const takeItem = (s: GameState, id: ItemId, amount = 1) => {
  s.inventory[id] = (s.inventory[id] || 0) - amount;
};
const addGear = (s: GameState, rank: number, rng: () => number) => {
  if (bagUsed(s) >= 120) return false;
  s.bag.push({
    uid: `g${s.nextUid++}`,
    slot: SLOTS[Math.floor(rng() * SLOTS.length)].id,
    rank: Math.max(0, Math.min(8, rank)),
    level: 0,
  });
  return true;
};

export function perform(
  original: GameState,
  action: Action,
  rng: () => number = Math.random,
  now = Date.now(),
): Result {
  const s: GameState = structuredClone(original);
  const fail = (message: string): Result => ({ state: original, message, ok: false });
  const done = (message?: string, type: 'story' | 'gain' | 'battle' | 'realm' = 'gain'): Result => {
    s.hp = Math.min(s.hp, stats(s).maxHp);
    if (message)
      s.events = [
        { id: (s.events[0]?.id || 0) + 1, text: message, type, time: now },
        ...s.events,
      ].slice(0, 60);
    return { state: s, message, ok: true };
  };
  const startBattle = (enemy: Enemy, enemyStage: number, place: string, secretId?: string) => {
    const growth = Math.pow(1.15, enemyStage),
      hp = Math.round(65 * growth * enemy.hpMultiplier);
    s.battle = {
      enemyId: enemy.id,
      kind: enemy.kind,
      enemyStage,
      enraged: false,
      ...(secretId ? { secretId } : {}),
      mapId: enemy.mapId,
      name: enemy.name,
      title: enemy.title,
      hp,
      maxHp: hp,
      attack: Math.round(13 * growth * enemy.attackMultiplier),
      defense: Math.round(3 * growth * enemy.defenseMultiplier),
      turn: 0,
      skillCooldown: 0,
      logs: [`${KIND_LABELS[enemy.kind]} · ${enemy.title} ${enemy.name} xuất hiện giữa ${place}!`],
    };
    if (!s.encounters.seen.includes(enemy.id)) s.encounters.seen.push(enemy.id);
  };
  if (s.daily.date !== dayKey(now))
    s.daily = { date: dayKey(now), meditations: 0, kills: 0, claimed: [] };
  if (s.battle && !['tick', 'fight'].includes(action.type))
    return fail('Hãy kết thúc trận chiến trước khi thực hiện hành động này.');
  switch (action.type) {
    case 'tick': {
      const elapsed = Math.min(8 * 3600, Math.max(0, (action.now - s.lastTick) / 1000));
      if (!s.battle) {
        s.stamina = Math.min(100, s.stamina + elapsed / 30);
        s.hp = Math.min(stats(s).maxHp, s.hp + (elapsed * stats(s).maxHp) / 600);
        const incenseSeconds =
          Math.max(0, Math.min(action.now, s.incenseUntil) - s.lastTick) / 1000;
        s.xp = Math.min(
          xpNeeded(s.stage) * 3,
          s.xp + Math.round((xpNeeded(s.stage) * 0.03 * incenseSeconds) / 60),
        );
      }
      s.lastTick = action.now;
      return done();
    }
    case 'meditate': {
      if (s.stamina < 3) return fail('Cần 3 thể lực. Hãy nghỉ ngơi hoặc đợi thể lực hồi phục.');
      if (s.stage === 59 && s.xp >= xpNeeded(59))
        return fail('Bạn đã chạm đến đỉnh cao của tam giới. Hãy khám phá đạo lộ còn lại.');
      s.stamina -= 3;
      const gain = Math.round(
        xpNeeded(s.stage) * 0.13 * stats(s).cultivation * (s.incenseUntil > now ? 1.2 : 1),
      );
      s.xp = Math.min(xpNeeded(s.stage) * 3, s.xp + gain);
      s.metrics.meditations++;
      s.daily.meditations++;
      return done(`Tĩnh tâm vận khí. Bạn hấp thu ${gain} tu vi từ linh khí thiên địa.`);
    }
    case 'breakthrough': {
      if (s.stage >= 59) return fail('Bạn đã đạt Thần Đế Đỉnh phong, cảnh giới tối thượng.');
      const need = xpNeeded(s.stage),
        cost = stoneCost(s.stage);
      if (s.xp < need) return fail(`Còn thiếu ${Math.ceil(need - s.xp)} tu vi để đột phá.`);
      if (s.stones < cost) return fail(`Cần ${cost} linh thạch để củng cố đạo cơ.`);
      s.xp -= need;
      s.stones -= cost;
      s.stage++;
      s.metrics.breakthroughs++;
      s.hp = stats(s).maxHp;
      s.stamina = Math.min(100, s.stamina + 20);
      if (s.stage % 3 === 0) addItem(s, 'elixir');
      return done(
        `${s.stage % 3 === 0 ? 'Thiên kiếp tan, đạo cơ thành! ' : 'Linh khí hội tụ! '}Bạn đã đạt ${realmName(s.stage)}.`,
        'realm',
      );
    }
    case 'rest': {
      if (s.stones < 25)
        return fail('Cần 25 linh thạch để nghỉ tại khách điếm. Thể lực tự hồi 2 điểm/phút.');
      if (s.stamina >= 100 && s.hp >= stats(s).maxHp)
        return fail('Bạn đang tràn đầy sinh lực và thể lực.');
      s.stones -= 25;
      s.stamina = Math.min(100, s.stamina + 25);
      s.hp = Math.min(stats(s).maxHp, s.hp + stats(s).maxHp * 0.5);
      return done('Một chén trà nóng tại khách điếm: hồi 25 thể lực và 50% sinh lực.');
    }
    case 'incense': {
      if (s.incenseUntil > now) return fail('Lư hương vẫn đang cháy. Hãy tận hưởng linh khí.');
      if (s.stones < 50) return fail('Cần 50 linh thạch để thắp Tụ Linh Hương.');
      s.stones -= 50;
      s.incenseUntil = now + 5 * 60000;
      return done(
        'Tụ Linh Hương được thắp: tu luyện +20% và tự tích lũy 3% tu vi/phút trong 5 phút.',
      );
    }
    case 'explore': {
      const map = MAPS.find((m) => m.id === action.mapId);
      if (!map) return fail('Không tìm thấy địa điểm.');
      if (s.stage < map.minStage)
        return fail(`Cần đạt ${realmName(map.minStage)} để vào ${map.name}.`);
      if (s.stamina < 8) return fail('Cần 8 thể lực để xuất hành.');
      if (s.hp < stats(s).maxHp * 0.15)
        return fail('Sinh lực quá thấp. Hãy hồi phục trước khi xuất hành.');
      s.stamina -= 8;
      s.metrics.explorations++;
      if (!s.explored.includes(map.id)) s.explored.push(map.id);
      s.encounters.visits[map.id] = (s.encounters.visits[map.id] || 0) + 1;
      const secret = SECRET_AREAS.find((area) => area.world === map.world)!;
      let discovery = '';
      if (
        !s.encounters.discoveredSecrets.includes(secret.id) &&
        worldVisits(s, map.world) >= secret.visitsNeeded
      ) {
        s.encounters.discoveredSecrets.push(secret.id);
        discovery = ` Cơ duyên mới: phát hiện ${secret.name}! Xem Bí cảnh trong Khám phá để tìm hiểu phong ấn.`;
      }
      if (rng() < 0.7) {
        const enemy = enemyForMap(map.id, rng());
        startBattle(enemy, Math.min(s.stage, map.minStage + 5), map.name);
        return done(
          `Bạn bước vào ${map.name}, gặp ${KIND_LABELS[enemy.kind].toLowerCase()} ${enemy.title} ${enemy.name}.${discovery}`,
          'battle',
        );
      }
      const reward = Math.round(18 * Math.pow(1.13, map.minStage)),
        item = rng() < 0.6 ? 'herb' : 'ore';
      s.stones += reward;
      addItem(s, item, 2);
      if (rng() < 0.12) addItem(s, 'key');
      return done(
        `${map.lore} Nhặt được ${reward} linh thạch và 2 ${ITEMS[item].name.toLowerCase()}.${discovery}`,
        'story',
      );
    }
    case 'challenge': {
      const area = SECRET_AREAS.find((secret) => secret.id === action.secretId);
      if (!area || !s.encounters.discoveredSecrets.includes(area.id))
        return fail('Bí cảnh chưa được phát hiện. Hãy xuất hành thêm ở giới tương ứng.');
      if (s.encounters.defeatedBosses.includes(area.boss.id))
        return fail('Boss ẩn đã bị đánh bại. Kho báu của bí cảnh chỉ được nhận một lần.');
      if (s.stage < area.minStage)
        return fail(`Cần đạt ${realmName(area.minStage)} để phá phong ấn.`);
      if (!(s.inventory.key || 0)) return fail('Cần 1 Cổ ngọc để mở phong ấn bí cảnh.');
      if (s.stamina < 16) return fail('Cần 16 thể lực để khiêu chiến boss ẩn.');
      if (s.hp < stats(s).maxHp * 0.5)
        return fail('Hãy hồi phục ít nhất 50% sinh lực trước khi khiêu chiến boss ẩn.');
      takeItem(s, 'key');
      s.stamina -= 16;
      startBattle(area.boss, area.minStage, area.name, area.id);
      return done(`${area.lore} Đã dùng 1 Cổ ngọc. ${area.boss.name} thức tỉnh!`, 'battle');
    }
    case 'fight': {
      const b = s.battle;
      if (!b) return fail('Bạn chưa ở trong trận chiến.');
      if (action.move === 'flee') {
        s.battle = null;
        return done(
          'Bạn thoát khỏi trận chiến, giữ vững đạo tâm. Phần thưởng chiến đấu chưa được nhận.',
          'battle',
        );
      }
      if (action.move === 'skill' && b.skillCooldown > 0)
        return fail(`Lưu Vân Quyết cần hồi ${b.skillCooldown} lượt.`);
      if (action.move === 'pill' && !(s.inventory.pill || 0))
        return fail('Không còn Hồi Xuân Đan trong ba lô.');
      b.turn++;
      b.skillCooldown = Math.max(0, b.skillCooldown - 1);
      const st = stats(s);
      if (action.move === 'pill') {
        takeItem(s, 'pill');
        s.hp = Math.min(st.maxHp, s.hp + Math.round(st.maxHp * 0.5));
        b.logs.push('Bạn uống Hồi Xuân Đan, hồi phục 50% sinh lực.');
      } else if (action.move === 'guard')
        b.logs.push('Bạn kết ấn phòng ngự, giảm 70% sát thương lượt này.');
      else {
        const critical = rng() < st.crit,
          multiplier = action.move === 'skill' ? 2.2 : 1;
        const damage = Math.max(
          1,
          Math.round((st.attack * multiplier - b.defense) * (critical ? 1.7 : 1)),
        );
        b.hp = Math.max(0, b.hp - damage);
        if (action.move === 'skill') b.skillCooldown = 3;
        b.logs.push(
          `${action.move === 'skill' ? 'Lưu Vân Quyết' : 'Bạn công kích'}${critical ? ' · Chí mạng!' : ''}: gây ${damage} sát thương.`,
        );
      }
      if (b.hp <= 0) {
        const enemy = ALL_ENEMIES.find((enemy) => enemy.id === b.enemyId)!;
        const enemyStage = b.enemyStage;
        const stones = Math.round(25 * Math.pow(1.14, enemyStage) * enemy.rewardMultiplier),
          xp = Math.round(xpNeeded(enemyStage) * 0.22 * enemy.rewardMultiplier);
        s.stones += stones;
        s.xp = Math.min(xpNeeded(s.stage) * 3, s.xp + xp);
        s.metrics.kills++;
        s.daily.kills++;
        const materialCount = b.kind === 'boss' ? 4 : b.kind === 'elite' ? 3 : 2;
        addItem(s, rng() < 0.5 ? 'herb' : 'ore', materialCount);
        let extra = '';
        if (b.kind === 'elite') {
          s.encounters.eliteKills++;
          addItem(s, 'essence');
          extra = ', +1 tinh hoa';
          if (rng() < 0.18) {
            addItem(s, 'key');
            extra += ', +1 Cổ ngọc';
          }
        }
        if (b.kind === 'boss') {
          s.encounters.defeatedBosses.push(b.enemyId);
          addItem(s, 'essence', 3);
          addItem(s, 'elixir', 2);
          extra = ', +3 tinh hoa, +2 Tụ Linh Đan';
        }
        const rank = Math.min(
          8,
          Math.floor(enemyStage / 7) + (b.kind === 'boss' ? 2 : rng() < 0.12 ? 1 : 0),
        );
        const drop = b.kind === 'boss' || rng() < (b.kind === 'elite' ? 0.75 : 0.45);
        const gear = drop && addGear(s, rank, rng);
        if (drop && !gear) {
          addItem(s, 'essence', rank + 1);
          extra += `, +${rank + 1} tinh hoa do ba lô đầy`;
        }
        s.battle = null;
        return done(
          `Đánh bại ${KIND_LABELS[b.kind].toLowerCase()} ${b.title} ${b.name}! +${xp} tu vi, +${stones} linh thạch, +${materialCount} nguyên liệu${gear ? ' và một trang bị mới' : ''}${extra}.`,
          'battle',
        );
      }
      if (b.kind === 'boss' && !b.enraged && b.hp <= b.maxHp * 0.35) {
        b.enraged = true;
        b.attack = Math.round(b.attack * 1.3);
        b.logs.push(`${b.name} cuồng nộ! Công kích tăng 30% cho phần còn lại của trận chiến.`);
      }
      const incoming = Math.max(
        1,
        Math.round((b.attack - st.defense * 0.55) * (action.move === 'guard' ? 0.3 : 1)),
      );
      s.hp = Math.max(0, s.hp - incoming);
      b.logs.push(`${b.name} phản công: bạn mất ${incoming} sinh lực.`);
      b.logs = b.logs.slice(-14);
      if (s.hp <= 0) {
        const lost = Math.min(s.stones, Math.round(s.stones * 0.05));
        s.stones -= lost;
        s.hp = Math.round(st.maxHp * 0.3);
        s.battle = null;
        return done(
          `Bạn bại trận, được người qua đường cứu. Mất ${lost} linh thạch và hồi tỉnh với 30% sinh lực.`,
          'battle',
        );
      }
      return done();
    }
    case 'equip': {
      const index = s.bag.findIndex((g) => g.uid === action.uid);
      if (index < 0) return fail('Trang bị không còn trong ba lô.');
      const [gear] = s.bag.splice(index, 1),
        old = s.equipped[gear.slot];
      if (old) s.bag.push(old);
      s.equipped[gear.slot] = gear;
      return done(
        `Đã trang bị ${SLOTS.find((slot) => slot.id === gear.slot)!.name.toLowerCase()}.`,
      );
    }
    case 'unequip': {
      const g = s.equipped[action.slot];
      if (!g) return fail('Ô trang bị đang trống.');
      if (bagUsed(s) >= 120) return fail('Ba lô đã đầy. Hãy phân giải trang bị trước.');
      s.bag.push(g);
      delete s.equipped[action.slot];
      return done('Đã cất trang bị vào ba lô.');
    }
    case 'upgrade': {
      const g = s.equipped[action.slot];
      if (!g) return fail('Hãy trang bị vật phẩm trước khi cường hóa.');
      if (g.level >= 10) return fail('Trang bị đã đạt cường hóa tối đa +10.');
      const cost = 30 * (g.level + 1) * (g.rank + 1);
      if (!(s.inventory.essence || 0) || s.stones < cost)
        return fail(`Cần 1 tinh hoa và ${cost} linh thạch để cường hóa.`);
      takeItem(s, 'essence');
      s.stones -= cost;
      g.level++;
      return done(`Cường hóa thành công! Trang bị đạt +${g.level}.`);
    }
    case 'salvage': {
      const i = s.bag.findIndex((g) => g.uid === action.uid);
      if (i < 0) return fail('Không tìm thấy trang bị.');
      const [gear] = s.bag.splice(i, 1);
      addItem(s, 'essence', gear.rank + 1);
      return done(`Phân giải trang bị, nhận ${gear.rank + 1} tinh hoa.`);
    }
    case 'craft': {
      const cost = action.recipe === 'gear' ? 45 : action.recipe === 'elixir' ? 35 : 15;
      const material = action.recipe === 'gear' ? 'ore' : 'herb',
        amount = action.recipe === 'elixir' ? 5 : 3;
      if ((s.inventory[material] || 0) < amount || s.stones < cost)
        return fail(`Cần ${amount} ${ITEMS[material].name.toLowerCase()} và ${cost} linh thạch.`);
      if (action.recipe === 'gear' && bagUsed(s) >= 120) return fail('Ba lô đã đầy.');
      takeItem(s, material, amount);
      s.stones -= cost;
      s.metrics.crafts++;
      if (action.recipe === 'gear')
        addGear(s, Math.min(8, Math.floor(s.stage / 7)) + (rng() < 0.2 ? 1 : 0), rng);
      else addItem(s, action.recipe);
      return done(
        `Chế tạo thành công: ${action.recipe === 'gear' ? 'một trang bị ngẫu nhiên theo tu vi' : ITEMS[action.recipe].name}.`,
      );
    }
    case 'buy': {
      const item = ITEMS[action.item];
      if (!item) return fail('Vật phẩm không tồn tại.');
      if (s.stones < item.price) return fail('Không đủ linh thạch.');
      s.stones -= item.price;
      addItem(s, action.item);
      s.metrics.trades++;
      return done(`Mua 1 ${item.name} với ${item.price} linh thạch.`);
    }
    case 'sell': {
      if (!(s.inventory[action.item] || 0)) return fail('Bạn không có vật phẩm này.');
      const price = Math.floor(ITEMS[action.item].price * 0.5);
      takeItem(s, action.item);
      s.stones += price;
      s.metrics.trades++;
      return done(`Bán 1 ${ITEMS[action.item].name}, nhận ${price} linh thạch.`);
    }
    case 'use': {
      if (!(s.inventory[action.item] || 0)) return fail('Không có đan dược này trong ba lô.');
      if (action.item === 'pill' && s.hp >= stats(s).maxHp) return fail('Sinh lực đã đầy.');
      takeItem(s, action.item);
      if (action.item === 'pill')
        s.hp = Math.min(stats(s).maxHp, s.hp + Math.round(stats(s).maxHp * 0.5));
      else s.xp = Math.min(xpNeeded(s.stage) * 3, s.xp + Math.round(xpNeeded(s.stage) * 0.35));
      return done(
        `Đã dùng ${ITEMS[action.item].name}${action.item === 'pill' ? ', hồi 50% sinh lực.' : ', nhận 35% tu vi cảnh giới hiện tại.'}`,
      );
    }
    case 'quest': {
      const q = QUESTS.find((q) => q.id === action.id);
      if (!q || (q.reveal && !q.reveal(s))) return fail('Cơ duyên này chưa được tìm thấy.');
      if (questClaimed(s, q)) return fail('Phần thưởng đã được nhận.');
      if (s.stage < q.minStage || q.progress(s) < q.target)
        return fail('Nhiệm vụ chưa hoàn thành.');
      if (q.category === 'daily') s.daily.claimed.push(q.id);
      else s.claimed.push(q.id);
      s.stones += q.stones;
      s.xp = Math.min(xpNeeded(s.stage) * 3, s.xp + q.xp);
      if (q.item) addItem(s, q.item);
      return done(
        `Hoàn thành “${q.name}”: +${q.stones} linh thạch, +${q.xp} tu vi${q.item ? `, +1 ${ITEMS[q.item].name}` : ''}.`,
      );
    }
    case 'join': {
      const sect = SECTS.find((t) => t.id === action.sectId);
      if (!sect) return fail('Tông môn không tồn tại.');
      if (s.sect) return fail('Bạn đã có tông môn. Hãy trân trọng tình đồng môn.');
      s.sect = sect.id;
      s.hp = stats(s).maxHp;
      return done(`Bạn gia nhập ${sect.name}, trở thành đệ tử ngoại môn. ${sect.bonus}.`, 'story');
    }
    case 'donate': {
      if (!s.sect) return fail('Hãy gia nhập tông môn trước.');
      if (s.stones < 50) return fail('Cần 50 linh thạch để đóng góp.');
      s.stones -= 50;
      s.contribution += 25;
      s.metrics.donations++;
      if (s.metrics.donations % 3 === 0) addItem(s, 'elixir');
      return done(
        `Đóng góp 50 linh thạch, nhận 25 cống hiến${s.metrics.donations % 3 === 0 ? ' và 1 Tụ Linh Đan từ trưởng lão' : ''}.`,
      );
    }
    case 'npc': {
      const npc = NPCS.find((n) => n.id === action.npcId);
      if (!npc || s.stage < npc.minStage) return fail('Chưa đủ tu vi để gặp nhân vật này.');
      if (!s.npcMet.includes(npc.id)) s.npcMet.push(npc.id);
      if (action.choice === 'gift') {
        if (!(s.inventory[npc.gift] || 0))
          return fail(`Cần 1 ${ITEMS[npc.gift].name} để trao đổi.`);
        takeItem(s, npc.gift);
        addItem(s, npc.reward);
        return done(
          `${npc.name} nhận ${ITEMS[npc.gift].name} và trao cho bạn 1 ${ITEMS[npc.reward].name}.`,
          'story',
        );
      }
      return done(`${npc.name}: ${npc.dialogue}`, 'story');
    }
    case 'profile': {
      const name = action.name.trim().slice(0, 24);
      if (!name) return fail('Đạo hiệu không được để trống.');
      s.name = name;
      if (action.race && !s.raceChosen && RACES.some((r) => r.id === action.race)) {
        s.race = action.race;
        s.raceChosen = true;
        s.hp = stats(s).maxHp;
      }
      return done(`Đạo hiệu của bạn là ${name}. Tiên lộ rộng mở.`, 'story');
    }
  }
}
