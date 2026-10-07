import { BookOpen, Check, Gem, LockKeyhole, Sparkles, Wind } from 'lucide-react';
import {
  INHERITANCES,
  MANUAL_LABELS,
  SPIRITUAL_ROOTS,
  rootCost,
  tierCost,
  tierLabel,
} from './game/expansion';
import { realmName, WORLDS } from './game/data';
import type { Action, GameState } from './game/types';
const fmt = (n: number) => Math.floor(n).toLocaleString('vi-VN');
type Props = { state: GameState; act: (a: Action) => boolean };
export function LineagePanel({ state: s, act }: Props) {
  const root = SPIRITUAL_ROOTS.find((r) => r.id === s.spiritualRoot?.id),
    level = s.spiritualRoot?.level || 1,
    cost = rootCost(level);
  return (
    <>
      <section className="panel root-sanctuary">
        <div className="root-orbit" style={{ color: root?.color || 'var(--gold)' }}>
          <div />
          <div />
          <span>{root?.symbol || '灵'}</span>
          <Sparkles size={22} />
        </div>
        <div>
          <span className="eyebrow">THIÊN TƯ & ĐẠO CỐT</span>
          <h2>{root?.name || 'Linh căn chưa thức tỉnh'}</h2>
          <p>
            {root?.lore ||
              'Kiểm tra một lần để biết linh căn bẩm sinh. Ngũ hành 85% · Dị linh căn 14% · Thiên linh căn 1%. Hỗn Độn linh căn đến từ truyền thừa Thái Sơ.'}
          </p>
          {root ? (
            <>
              <div className="root-metrics">
                <span className="tag">{root.rarity}</span>
                <span>
                  Tầng {level}/10 · Tinh khiết {level * 10}%
                </span>
                <strong>
                  +{Math.round(root.bonus * level * 100)}% {MANUAL_LABELS[root.attribute]}
                </strong>
              </div>
              <small>
                Tẩy luyện: {cost.qi} linh khí · {cost.stones} linh thạch · {cost.essence} tinh hoa
              </small>
              <button
                className="button primary"
                disabled={
                  level === 10 ||
                  !!s.battle ||
                  s.lingqi < cost.qi ||
                  s.stones < cost.stones ||
                  (s.inventory.essence || 0) < cost.essence
                }
                onClick={() => act({ type: 'purify-root' })}
              >
                <Wind size={16} />
                {level === 10 ? 'Đạo cốt viên mãn' : 'Tẩy luyện linh căn'}
              </button>
            </>
          ) : (
            <button
              className="button primary"
              disabled={!!s.battle}
              onClick={() => act({ type: 'awaken-root' })}
            >
              <Sparkles size={16} />
              Kiểm tra linh căn
            </button>
          )}
        </div>
      </section>
      <div className="root-catalog">
        {SPIRITUAL_ROOTS.map((r) => (
          <div key={r.id} className={root?.id === r.id ? 'selected' : ''}>
            <span style={{ color: r.color }}>{r.symbol}</span>
            <strong>{r.name}</strong>
            <small>{r.rarity}</small>
          </div>
        ))}
      </div>
      <div className="expansion-heading">
        <BookOpen size={26} />
        <div>
          <span className="eyebrow">ĐẠO THỐNG CỔ NHÂN</span>
          <h2>{INHERITANCES.length} truyền thừa trong tam giới</h2>
          <p>
            Tìm dấu tích qua NPC và bí cảnh, hoàn thành thử thách rồi dùng linh khí tiếp nhận. Gia
            trì vĩnh viễn cộng dồn; chiến lợi phẩm mỗi truyền thừa chỉ nhận một lần.
          </p>
        </div>
      </div>
      <div className="expansion-grid">
        {INHERITANCES.map((i) => {
          const found = i.reveal(s),
            claimed = s.inheritances.includes(i.id),
            ready = found && s.stage >= i.minStage && i.ready(s),
            coin = tierCost(i.minStage, 3);
          return (
            <article key={i.id} className={`panel content-card ${claimed ? 'attuned' : ''}`}>
              <div className={`rune-art ${i.world}`}>
                <BookOpen size={60} strokeWidth={0.8} />
                <b>{found ? i.symbol : '?'}</b>
                <span>{WORLDS.find((w) => w.id === i.world)!.name}</span>
              </div>
              <div className="content-card-body">
                <span className={`tag ${claimed ? 'green' : ''}`}>
                  {claimed ? (
                    <>
                      <Check size={12} />
                      Đã kế thừa
                    </>
                  ) : found ? (
                    'Đã tìm thấy'
                  ) : (
                    'Dấu tích chưa rõ'
                  )}
                </span>
                <h3>{found ? i.name : 'Đạo thống thất lạc'}</h3>
                <p>{found ? i.lore : i.hint}</p>
                <small>{found ? i.requirement : i.hint}</small>
                {i.progress && i.target && (
                  <label className="legacy-progress">
                    Thử thách {Math.min(i.target, i.progress(s))}/{i.target}
                    <progress
                      aria-label={`Thử thách ${i.name}`}
                      value={Math.min(i.target, i.progress(s))}
                      max={i.target}
                    />
                  </label>
                )}
                <strong className="bonus-line">
                  +{Math.round(i.bonus * 100)}% {MANUAL_LABELS[i.attribute]} vĩnh viễn
                </strong>
                <small>
                  {realmName(i.minStage)} · {i.qi} linh khí
                  {coin ? ` · ${coin.amount} ${tierLabel(coin.kind)}` : ''}
                </small>
                <button
                  className="button primary"
                  disabled={
                    !ready ||
                    claimed ||
                    s.lingqi < i.qi ||
                    !!s.battle ||
                    !!(coin && s.wallet[coin.kind] < coin.amount)
                  }
                  onClick={() => act({ type: 'inherit', id: i.id })}
                >
                  {claimed ? (
                    'Đạo thống đã tiếp nối'
                  ) : ready ? (
                    'Nhận truyền thừa'
                  ) : (
                    <>
                      <LockKeyhole size={13} />
                      Hoàn thành thử thách
                    </>
                  )}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
export function CurrencyPanel({ state: s, act }: Props) {
  return (
    <section className="currency-panel">
      <div className="wallet-grid">
        {[
          { name: 'Linh thạch', value: s.stones, symbol: '灵', world: 'earth' },
          { name: 'Tiên thạch', value: s.wallet.immortal, symbol: '仙', world: 'immortal' },
          { name: 'Thần thạch', value: s.wallet.divine, symbol: '神', world: 'divine' },
        ].map((c) => (
          <div className={`wallet-coin ${c.world}`} key={c.world}>
            <Gem size={24} />
            <span>{c.symbol}</span>
            <strong>{fmt(c.value)}</strong>
            <small>{c.name}</small>
          </div>
        ))}
      </div>
      <p>
        Chiến lợi phẩm theo giới. 1 tiên thạch = 1.000 linh thạch · 1 thần thạch = 1.000 tiên thạch.
      </p>
      <div className="currency-exchanges">
        {[
          {
            from: 'spirit' as const,
            direction: 'up' as const,
            name: '1.000 linh → 1 tiên',
            disabled: s.stones < 1000,
          },
          {
            from: 'immortal' as const,
            direction: 'down' as const,
            name: '1 tiên → 1.000 linh',
            disabled: s.wallet.immortal < 1,
          },
          {
            from: 'immortal' as const,
            direction: 'up' as const,
            name: '1.000 tiên → 1 thần',
            disabled: s.wallet.immortal < 1000,
          },
          {
            from: 'divine' as const,
            direction: 'down' as const,
            name: '1 thần → 1.000 tiên',
            disabled: s.wallet.divine < 1,
          },
        ].map((c) => (
          <button
            className="button secondary"
            key={c.name}
            disabled={c.disabled || !!s.battle}
            onClick={() => act({ type: 'exchange-currency', from: c.from, direction: c.direction })}
          >
            {c.name}
          </button>
        ))}
      </div>
    </section>
  );
}
