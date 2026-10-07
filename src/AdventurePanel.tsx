import { useState } from 'react';
import {
  Bird,
  Leaf,
  FlaskConical,
  Compass,
  Sparkles,
  LockKeyhole,
  Check,
  Timer,
  BookOpen,
} from 'lucide-react';
import type { Action, GameState } from './game/types';
import {
  ADVENTURE_CONTENT_COUNT,
  DAO_LABELS,
  PETS,
  MATERIALS,
  SEEDS,
  TALISMANS,
  EXPEDITIONS,
} from './game/ascension';
import { realmName } from './game/data';
import './adventure.css';
const count = (n: number) => n.toLocaleString('vi-VN');
const time = (end: number, now: number) => {
  const sec = Math.max(0, Math.ceil((end - now) / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};
export function AdventurePanel({
  state: s,
  act,
  onQuests,
}: {
  state: GameState;
  act: (a: Action) => unknown;
  onQuests: () => void;
}) {
  const [tab, setTab] = useState('pets'),
    [seed, setSeed] = useState('moonleaf');
  const a = s.adventure,
    now = s.lastTick,
    active = PETS.find((p) => p.id === a.activePet),
    charm = TALISMANS.find((t) => t.id === a.activeTalisman?.id);
  return (
    <div className="dao-page">
      <section className="panel dao-hero">
        <div>
          <span className="eyebrow">ĐỘNG THIÊN · VẠN VẬT CÙNG TU</span>
          <h2>
            Một cõi riêng.
            <br />
            Vạn mùa cơ duyên.
          </h2>
          <p>
            Linh thú bên vai, linh dược dưới hiên. Trở về vun trồng trước khi bước tiếp vào tam
            giới.
          </p>
          <button className="button secondary" onClick={onQuests}>
            <BookOpen size={17} />
            Theo dõi cốt truyện mới
          </button>
        </div>
        <div className="dao-emblem" aria-hidden="true">
          <span>{active?.symbol || '🌙'}</span>
          <i>洞天</i>
          <Leaf size={34} />
        </div>
      </section>
      <div className="dao-summary">
        <article>
          <span>Uy tín Động Thiên</span>
          <strong>{count(a.reputation)}</strong>
        </article>
        <article>
          <span>Linh thú khế ước</span>
          <strong>{Object.keys(a.pets).length}/12</strong>
        </article>
        <article>
          <span>Linh viên</span>
          <strong>{a.plots} luống</strong>
        </article>
        <article>
          <span>Nội dung mới 1.6</span>
          <strong>{ADVENTURE_CONTENT_COUNT}+</strong>
        </article>
      </div>
      {charm && a.activeTalisman!.until > now && (
        <p className="dao-buff" role="status">
          <Sparkles size={18} />
          {charm.name} · {DAO_LABELS[charm.attribute]} +12% · còn{' '}
          {time(a.activeTalisman!.until, now)}
        </p>
      )}
      <nav className="dao-tabs" aria-label="Động Thiên">
        {[
          ['pets', 'Linh thú', Bird],
          ['garden', 'Linh viên', Leaf],
          ['seals', 'Phù lục', FlaskConical],
          ['routes', 'Viễn chinh', Compass],
        ].map(([id, label, Icon]) => {
          const I = Icon as typeof Bird;
          return (
            <button
              key={String(id)}
              className={tab === id ? 'active' : ''}
              onClick={() => setTab(String(id))}
              aria-pressed={tab === id}
            >
              <I size={18} />
              {String(label)}
            </button>
          );
        })}
      </nav>
      {tab === 'pets' && (
        <>
          <div className="dao-section-heading">
            <h3>Khế ước dưới ánh trăng</h3>
            <p>Một linh thú xuất chiến. Thân mật đầy 100 sẽ tăng cấp; tối đa cấp 10.</p>
          </div>
          <div className="dao-grid">
            {PETS.map((p) => {
              const owned = a.pets[p.id],
                locked = s.stage < p.minStage || s.metrics.kills < p.kills;
              return (
                <article
                  className={`panel dao-card ${a.activePet === p.id ? 'selected' : ''}`}
                  key={p.id}
                >
                  <div className="dao-card-top">
                    <span className="dao-animal">{p.symbol}</span>
                    <span className="dao-pill">
                      {owned ? `Cấp ${owned.level}` : realmName(p.minStage)}
                    </span>
                  </div>
                  <h3>{p.name}</h3>
                  <p>{p.lore}</p>
                  <strong className="dao-bonus">
                    {DAO_LABELS[p.attribute]} +{(p.bonus * (owned?.level || 1) * 100).toFixed(1)}%
                  </strong>
                  {owned ? (
                    <>
                      <label>
                        Thân mật {owned.bond}/100
                        <progress value={owned.bond} max={100} />
                      </label>
                      <div className="dao-card-actions">
                        <button
                          className="button secondary"
                          onClick={() => act({ type: 'activate-pet', id: p.id })}
                          disabled={a.activePet === p.id}
                        >
                          {a.activePet === p.id ? <Check size={15} /> : <Bird size={15} />}Xuất
                          chiến
                        </button>
                        <button
                          className="button primary"
                          disabled={owned.level >= 10}
                          onClick={() => act({ type: 'feed-pet', id: p.id })}
                        >
                          Chăm sóc
                        </button>
                      </div>
                      <small>3 linh thảo + 1 Hồi Xuân Đan + {owned.level * 20} linh thạch</small>
                    </>
                  ) : (
                    <>
                      <small>
                        Cần {p.kills} lần trừ yêu · {p.price} linh thạch
                      </small>
                      <button
                        className="button primary"
                        disabled={locked}
                        onClick={() => act({ type: 'adopt-pet', id: p.id })}
                      >
                        {locked ? <LockKeyhole size={15} /> : <Sparkles size={15} />}Kết khế ước
                      </button>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
      {tab === 'garden' && (
        <>
          <div className="dao-section-heading">
            <h3>Linh viên bốn mùa</h3>
            <p>
              Linh dược vẫn trưởng thành khi đóng game. Thu hoạch để luyện phù hoặc bán cho đạo hữu.
            </p>
            <label>
              Giống linh dược{' '}
              <select value={seed} onChange={(e) => setSeed(e.target.value)}>
                {SEEDS.filter((x) => s.stage >= x.minStage).map((x) => (
                  <option value={x.id} key={x.id}>
                    {x.name} · {x.price} linh thạch · {x.seconds / 60} phút
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button secondary"
              disabled={a.plots >= 6}
              onClick={() => act({ type: 'expand-garden' })}
            >
              Mở thêm luống · {a.plots * 120} linh thạch + 4 huyền thiết
            </button>
          </div>
          <div className="dao-grid">
            {Array.from({ length: a.plots }, (_, plot) => {
              const crop = a.garden.find((p) => p.plot === plot),
                info = SEEDS.find((x) => x.id === crop?.seed),
                m = MATERIALS.find((x) => x.id === info?.material),
                ready = !!crop && now >= crop.readyAt;
              return (
                <article className="panel dao-card dao-plot" key={plot}>
                  <span className="dao-animal">{crop ? m?.symbol : '🌱'}</span>
                  <span className="eyebrow">LUỐNG {plot + 1}</span>
                  <h3>{info?.name || 'Đất đợi người gieo'}</h3>
                  {crop ? (
                    <>
                      <p>
                        {ready ? 'Linh dược đã trưởng thành' : `Còn ${time(crop.readyAt, now)}`}
                      </p>
                      <progress
                        max={crop.readyAt - crop.plantedAt}
                        value={Math.min(
                          crop.readyAt - crop.plantedAt,
                          Math.max(0, now - crop.plantedAt),
                        )}
                      />
                      <button
                        className="button primary"
                        disabled={!ready}
                        onClick={() => act({ type: 'harvest', plot })}
                      >
                        <Leaf size={16} />
                        Thu hoạch 3 nguyên liệu
                      </button>
                    </>
                  ) : (
                    <>
                      <p>Gieo hạt để đón mùa cơ duyên.</p>
                      <button
                        className="button primary"
                        onClick={() => act({ type: 'plant', id: seed, plot })}
                      >
                        Gieo linh dược
                      </button>
                    </>
                  )}
                </article>
              );
            })}
          </div>
          <MaterialStore state={s} />
        </>
      )}
      {tab === 'seals' && (
        <>
          <div className="dao-section-heading">
            <h3>Phù lục khắc ý trời</h3>
            <p>
              Mỗi lần luyện được 2 phù. Chỉ một phù gia trì cùng lúc; không thể cộng dồn bằng nhấn
              liên tục.
            </p>
          </div>
          <MaterialStore state={s} />
          <div className="dao-grid">
            {TALISMANS.map((t) => (
              <article className="panel dao-card" key={t.id}>
                <span className="dao-seal" aria-hidden="true">
                  符
                </span>
                <span className="dao-pill">{realmName(t.minStage)}</span>
                <h3>{t.name}</h3>
                <p>{t.description}</p>
                <small>
                  2 {MATERIALS.find((m) => m.id === t.plant)!.name} + 1{' '}
                  {MATERIALS.find((m) => m.id === t.dust)!.name} + 1 tinh hoa
                </small>
                <div className="dao-card-actions">
                  <button
                    className="button secondary"
                    disabled={s.stage < t.minStage}
                    onClick={() => act({ type: 'craft-talisman', id: t.id })}
                  >
                    <FlaskConical size={15} />
                    Luyện phù
                  </button>
                  <button
                    className="button primary"
                    disabled={
                      !(a.talismans[t.id] || 0) ||
                      s.stage < t.minStage ||
                      !!(a.activeTalisman && a.activeTalisman.until > now)
                    }
                    onClick={() => act({ type: 'use-talisman', id: t.id })}
                  >
                    Dùng · {a.talismans[t.id] || 0}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
      {tab === 'routes' && (
        <>
          <div className="dao-section-heading">
            <h3>Cổ lộ viễn chinh</h3>
            <p>
              Một đoàn đang hoạt động. Mỗi chuyến cần 15 thể lực và 20 linh thạch; trở về nhận 3
              nguyên liệu cùng uy tín.
            </p>
          </div>
          {a.expeditions.active && (
            <section className="panel dao-return">
              <Compass size={28} />
              <div>
                <h3>{EXPEDITIONS.find((x) => x.id === a.expeditions.active!.id)!.name}</h3>
                <p>
                  {now >= a.expeditions.active.readyAt
                    ? 'Đoàn đã trở về!'
                    : `Còn ${time(a.expeditions.active.readyAt, now)}`}
                </p>
              </div>
              <button
                className="button primary"
                disabled={now < a.expeditions.active.readyAt}
                onClick={() => act({ type: 'collect-expedition' })}
              >
                Nhận chiến lợi phẩm
              </button>
            </section>
          )}
          <div className="dao-grid">
            {EXPEDITIONS.map((r) => (
              <article className="panel dao-card" key={r.id}>
                <Compass size={30} />
                <span className="dao-pill">{realmName(r.minStage)}</span>
                <h3>{r.name}</h3>
                <p>{r.lore}</p>
                <small>
                  <Timer size={14} />
                  {r.seconds / 60} phút · đã hoàn thành {a.expeditions.completed[r.id] || 0} chuyến
                </small>
                <strong className="dao-bonus">
                  3 {MATERIALS.find((m) => m.id === r.material)!.name}
                </strong>
                <button
                  className="button primary"
                  disabled={s.stage < r.minStage || !!a.expeditions.active || !!s.battle}
                  onClick={() => act({ type: 'start-expedition', id: r.id })}
                >
                  Khởi hành
                </button>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
function MaterialStore({ state }: { state: GameState }) {
  return (
    <section className="panel dao-store">
      <h3>Kho động thiên</h3>
      <div>
        {MATERIALS.map((m) => (
          <span key={m.id}>
            {m.symbol} {m.name}
            <strong>{state.adventure.materials[m.id] || 0}</strong>
          </span>
        ))}
      </div>
    </section>
  );
}
