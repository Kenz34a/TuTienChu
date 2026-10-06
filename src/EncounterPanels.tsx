import { Check, Eye, Gem, LockKeyhole, Shield, Sparkles, Swords, Zap } from 'lucide-react';
import { Landscape } from './Landscape';
import { MAPS, RANKS, realmName } from './game/data';
import { ENEMIES, KIND_LABELS, SECRET_AREAS, worldVisits } from './game/encounters';
import type { GameState, World } from './game/types';

export function SecretPanel({
  state: s,
  world,
  onChallenge,
}: {
  state: GameState;
  world: World;
  onChallenge: (id: string) => void;
}) {
  const area = SECRET_AREAS.find((area) => area.world === world)!;
  const visits = worldVisits(s, world),
    discovered = s.encounters.discoveredSecrets.includes(area.id),
    defeated = s.encounters.defeatedBosses.includes(area.boss.id);
  const ready =
    discovered &&
    !defeated &&
    s.stage >= area.minStage &&
    (s.inventory.key || 0) >= 1 &&
    s.stamina >= 16;
  return (
    <section
      className={`secret-area panel ${discovered ? 'discovered' : 'undiscovered'} ${defeated ? 'defeated' : ''}`}
      aria-label="Bí cảnh ẩn"
    >
      <div className="secret-art">
        <Landscape terrain="temple" night={world !== 'earth'} />
        <span>{discovered ? '秘' : '？'}</span>
        <small>
          {defeated ? 'PHONG ẤN ĐÃ TAN' : discovered ? 'CƠ DUYÊN HIỆN THẾ' : 'DẤU TÍCH BỊ CHE GIẤU'}
        </small>
      </div>
      <div className="secret-content">
        <span className="eyebrow">BÍ CẢNH · BOSS ẨN</span>
        <div className="secret-heading">
          <h2>{discovered ? area.name : 'Dấu tích chưa rõ'}</h2>
          <span className={`tag ${defeated ? 'green' : ''}`}>
            {defeated ? (
              <>
                <Check size={12} />
                Đã chinh phục
              </>
            ) : discovered ? (
              <>
                <Eye size={12} />
                Đã phát hiện
              </>
            ) : (
              <>
                <LockKeyhole size={12} />
                Chưa phát hiện
              </>
            )}
          </span>
        </div>
        <p>{discovered ? area.lore : area.hint}</p>
        {discovered && (
          <div className="secret-boss-name">
            <Swords size={15} />
            <strong>{area.boss.name}</strong>
            <span>{area.boss.title}</span>
          </div>
        )}
        <div className="secret-requirements">
          <span className={discovered ? 'met' : ''}>
            <Eye size={13} />
            {Math.min(visits, area.visitsNeeded)}/{area.visitsNeeded} lần xuất hành trong giới
          </span>
          <span className={s.stage >= area.minStage ? 'met' : ''}>
            <Sparkles size={13} />
            {realmName(area.minStage)}
          </span>
          <span className={(s.inventory.key || 0) >= 1 ? 'met' : ''}>
            <Gem size={13} />1 Cổ ngọc · Có {s.inventory.key || 0}
          </span>
          <span className={s.stamina >= 16 ? 'met' : ''}>
            <Zap size={13} />
            16 thể lực
          </span>
        </div>
        <div className="secret-actions">
          <button className="button primary" disabled={!ready} onClick={() => onChallenge(area.id)}>
            {defeated ? (
              <>
                <Check size={16} />
                Bí cảnh đã hoàn thành
              </>
            ) : (
              <>
                <Swords size={16} />
                Phá phong ấn · Khiêu chiến
              </>
            )}
          </button>
          <small>
            {discovered
              ? `Thưởng một lần: trang bị từ ${RANKS[Math.min(8, Math.floor(area.minStage / 7) + 2)].name}, 3 tinh hoa, 2 Tụ Linh Đan và chiến lợi phẩm ×6.`
              : 'Khám phá đủ 5 lần tại bất kỳ khu vực nào của giới này để tìm lối vào.'}
          </small>
        </div>
        {discovered && !defeated && (
          <div className="secret-warning">
            <Shield size={13} />
            Cần ít nhất 50% sinh lực. Cổ ngọc tiêu hao khi vào, kể cả rút lui/bại trận. Boss cuồng
            nộ khi còn 35% sinh lực.
          </div>
        )}
      </div>
    </section>
  );
}

export function Bestiary({ mapId, state }: { mapId: string; state: GameState }) {
  const map = MAPS.find((map) => map.id === mapId)!;
  return (
    <div className="bestiary">
      <div className="bestiary-intro">
        <Swords size={21} />
        <p>
          Trong các trận khám phá: 80% gặp quái thường, 20% gặp tinh anh. Tinh anh mạnh hơn, thưởng
          ×2,2, luôn rơi 1 tinh hoa và có cơ hội rơi Cổ ngọc.
        </p>
      </div>
      {(['normal', 'elite'] as const).map((kind) => (
        <section key={kind}>
          <h3>
            {KIND_LABELS[kind]}
            <span>{kind === 'normal' ? '3 loại' : '2 loại'}</span>
          </h3>
          <div className="bestiary-list">
            {ENEMIES.filter((enemy) => enemy.mapId === mapId && enemy.kind === kind).map(
              (enemy) => (
                <article className={`bestiary-enemy ${kind}`} key={enemy.id}>
                  <span className="monster-glyph">{kind === 'elite' ? '煞' : '妖'}</span>
                  <div>
                    <strong>{enemy.name}</strong>
                    <small>
                      {enemy.title} · {realmName(map.minStage)} trở lên
                    </small>
                    <p>
                      {kind === 'elite'
                        ? 'Sinh lực ×1,65 · Công kích ×1,3 · Phòng thủ ×1,4'
                        : 'Yêu quái bản địa · Cơ hội rơi trang bị 45%'}
                    </p>
                  </div>
                  <span
                    className={`tag ${state.encounters.seen.includes(enemy.id) ? 'green' : ''}`}
                  >
                    {state.encounters.seen.includes(enemy.id) ? (
                      <>
                        <Check size={11} />
                        Đã gặp
                      </>
                    ) : (
                      'Chưa gặp'
                    )}
                  </span>
                </article>
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
