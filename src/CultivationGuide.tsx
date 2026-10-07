import { PHASE_COUNT, MAX_STAGE } from './game/stages';
import { ArrowUpRight, BookOpen, Check, LockKeyhole, Sparkles } from 'lucide-react';
import './cultivation.css';
import { REALM_METHODS, currentRealmMethod } from './game/realmMethods';
import { REALMS, STAGES, xpNeeded, stoneCost } from './game/data';
import { qiCost, breakthroughTier, tierLabel } from './game/expansion';
import type { GameState } from './game/types';

export function CultivationGuide({
  state: s,
  onCultivate,
}: {
  state: GameState;
  onCultivate: () => void;
}) {
  const current = currentRealmMethod(s.stage);
  return (
    <div className="cultivation-guide">
      <section className="panel guide-intro">
        <BookOpen size={36} />
        <div>
          <span className="eyebrow">HAI MƯƠI CON ĐƯỜNG ĐẠI ĐẠO</span>
          <h2>Tu luyện có pháp. Đột phá có đường.</h2>
          <p>
            Trong mỗi cảnh giới, tu luyện qua Sơ kỳ, Trung kỳ, Hậu kỳ rồi Đỉnh phong. Đầy tu vi vẫn
            cần đủ linh khí và thạch. Mỗi lần thành công sẽ trừ đúng chi phí, không có tỷ lệ thất
            bại ngẫu nhiên.
          </p>
        </div>
      </section>
      <section className="panel guide-current">
        <h3>
          Đạo lộ hiện tại · {current.realm} {current.phase}
        </h3>
        <strong>{current.name}</strong>
        <p>{current.ascending ? current.ascent : current.phases}</p>
        <button className="button primary" onClick={onCultivate}>
          <ArrowUpRight size={16} />
          Về tu luyện & đột phá
        </button>
        <p>
          Chọn Tĩnh tâm ngưng tụ, Đan dược hộ đạo (1 Tụ Linh Đan giảm 20% linh khí) hoặc Linh trận
          trợ lực (1 tinh hoa giảm 20% linh thạch) tại bảng tu luyện.
        </p>
      </section>
      <div className="realm-method-grid">
        {REALM_METHODS.map((m, index) => (
          <article
            className={`panel realm-method-card ${index === Math.floor(s.stage / PHASE_COUNT) ? 'current' : ''}`}
            key={m.realm}
            aria-label={`Cách đột phá ${m.realm}`}
          >
            <div className="realm-method-heading">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3>{m.realm}</h3>
                <small>
                  {s.stage >= m.minStage ? <Check size={12} /> : <LockKeyhole size={12} />}
                  {index === Math.floor(s.stage / PHASE_COUNT)
                    ? 'Đang tu luyện'
                    : s.stage >= m.minStage
                      ? 'Đã đạt'
                      : 'Chưa đạt'}
                </small>
              </div>
              <Sparkles size={21} />
            </div>
            <h4>{m.name}</h4>
            <p>{m.lore}</p>
            <div className="realm-method-phases">
              <strong>Sơ kỳ → Trung kỳ → Hậu kỳ → Đỉnh phong</strong>
              <p>{m.phases}</p>
            </div>
            <strong className="realm-method-ascent">
              {index < 19 ? `Đỉnh phong → ${REALMS[index + 1]} Sơ kỳ` : 'Đạo lộ tối thượng'}
            </strong>
            <p>{m.ascent}</p>
            <details>
              <summary>Chi phí cơ bản từng giai đoạn</summary>
              {STAGES.map((phase, p) => {
                const stage = m.minStage + p,
                  coin = breakthroughTier(stage);
                return (
                  <p key={phase}>
                    {phase}:{' '}
                    {stage === MAX_STAGE
                      ? 'Cảnh giới tối thượng'
                      : `${xpNeeded(stage).toLocaleString('vi-VN')} tu vi · ${qiCost(stage)} linh khí · ${stoneCost(stage).toLocaleString('vi-VN')} linh thạch${coin ? ` · ${coin.amount} ${tierLabel(coin.kind)}` : ''}`}
                  </p>
                );
              })}
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}
