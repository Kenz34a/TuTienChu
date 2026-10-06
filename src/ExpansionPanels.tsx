import { useState } from 'react';
import {
  BookOpen,
  Castle,
  Check,
  Clock3,
  Crown,
  Flame,
  Gem,
  Heart,
  Leaf,
  LockKeyhole,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Wind,
  Zap,
} from 'lucide-react';
import { Landscape } from './Landscape';
import {
  MANUALS,
  MANUAL_LABELS,
  DUNGEONS,
  sectBuildCost,
  studyCost,
  tierCost,
  tierLabel,
} from './game/expansion';
import { realmName, WORLDS } from './game/data';
import type { Action, GameState } from './game/types';
import type { useCommunity } from './cloud/useCommunity';

type Props = { state: GameState; act: (a: Action) => boolean };
const fmt = (n: number) => Math.floor(n).toLocaleString('vi-VN');
export function CultivatorArt({ active = false }: { active?: boolean }) {
  return (
    <svg
      className={`cultivator-art ${active ? 'is-meditating' : ''}`}
      viewBox="0 0 240 160"
      role="img"
      aria-label="Đạo nhân ngồi thiền giữa linh sơn"
    >
      <circle cx="120" cy="76" r="62" fill="currentColor" opacity=".06" />
      <circle
        className="breathing-aura"
        cx="120"
        cy="76"
        r="48"
        fill="none"
        stroke="currentColor"
        opacity=".25"
        strokeDasharray="3 7"
      />
      <path d="M0 140L48 68l46 58 29-33 48 39 33-57 36 65" fill="currentColor" opacity=".08" />
      <path d="M14 139q100-24 212 0" fill="none" stroke="currentColor" opacity=".2" />
      <circle cx="120" cy="54" r="13" fill="currentColor" opacity=".75" />
      <path
        d="M111 43q9-16 18 0M112 70h16l10 32 31 20q5 9-8 10H79q-13-1-8-10l31-20z"
        fill="currentColor"
        opacity=".75"
      />
      <path
        d="M109 78L93 105 78 108M131 78l16 27 15 3M96 122l24-9 24 9"
        fill="none"
        stroke="var(--paper)"
        strokeWidth="2"
      />
      <path d="M32 57q10-20 20 0M184 41q9-16 18 0" stroke="currentColor" fill="none" opacity=".4" />
    </svg>
  );
}
export function ManualsPanel({ state: s, act }: Props) {
  const [filter, setFilter] = useState('all');
  return (
    <>
      <div className="expansion-banner panel">
        <BookOpen size={32} />
        <div>
          <span className="eyebrow">TÀNG KINH CÁC</span>
          <h2>Một quyển đạo thư, một con đường</h2>
          <p>
            15 bí kíp · Tối đa tầng 10 · Vận hành đồng thời 3 bí kíp. Linh khí tích lũy qua ngồi
            thiền dùng để tham ngộ.
          </p>
        </div>
        <strong>{s.activeManuals.length}/3 đang vận hành</strong>
      </div>
      <div className="filter-tabs" role="group" aria-label="Lọc bí kíp">
        {[{ id: 'all', name: 'Tất cả' }, ...WORLDS].map((w) => (
          <button
            key={w.id}
            className={filter === w.id ? 'active' : ''}
            onClick={() => setFilter(w.id)}
          >
            {w.name}
          </button>
        ))}
      </div>
      <div className="expansion-grid">
        {MANUALS.filter((m) => filter === 'all' || m.world === filter).map((m) => {
          const level = s.manuals[m.id] || 0,
            cost = studyCost(level, m.minStage),
            coin = tierCost(m.minStage, level + 1),
            active = s.activeManuals.includes(m.id),
            locked = s.stage < m.minStage;
          const Icon =
            m.attribute === 'attack'
              ? Swords
              : m.attribute === 'defense'
                ? Shield
                : m.attribute === 'health'
                  ? Heart
                  : Wind;
          return (
            <article
              key={m.id}
              className={`panel content-card manual-card ${active ? 'attuned' : ''}`}
            >
              <div className={`rune-art ${m.world}`}>
                <BookOpen size={62} strokeWidth={0.7} />
                <b>{m.symbol}</b>
                <span>{WORLDS.find((w) => w.id === m.world)!.name}</span>
              </div>
              <div className="content-card-body">
                <span className="tag">
                  <Icon size={13} /> {level ? `Tầng ${level}/10` : 'Chưa tham ngộ'}
                </span>
                <h3>{m.name}</h3>
                <p>{m.description}</p>
                <strong className="bonus-line">
                  +{Math.round(m.bonus * Math.max(1, level) * 100)}% {MANUAL_LABELS[m.attribute]}{' '}
                  {level ? '' : 'ở tầng 1'}
                </strong>
                <small>
                  {locked
                    ? `Yêu cầu ${realmName(m.minStage)}`
                    : `Tham ngộ: ${fmt(cost.stones)} linh thạch · ${fmt(cost.qi)} linh khí${coin ? ` · ${coin.amount} ${tierLabel(coin.kind)}` : ''}`}
                </small>
                <div className="card-actions">
                  <button
                    className="button primary"
                    disabled={
                      locked ||
                      level === 10 ||
                      s.stones < cost.stones ||
                      s.lingqi < cost.qi ||
                      !!(coin && s.wallet[coin.kind] < coin.amount) ||
                      !!s.battle
                    }
                    onClick={() => act({ type: 'study', id: m.id })}
                  >
                    {level === 10 ? 'Viên mãn' : level ? 'Tham ngộ tầng tiếp' : 'Học bí kíp'}
                  </button>
                  {level > 0 && (
                    <button
                      className="button secondary"
                      disabled={!!s.battle}
                      onClick={() => act({ type: 'activate-manual', id: m.id })}
                    >
                      {active ? (
                        <>
                          <Check size={14} />
                          Ngừng
                        </>
                      ) : (
                        'Vận hành'
                      )}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
export function DungeonsPanel({ state: s, act }: Props) {
  return (
    <>
      <div className="expansion-banner panel">
        <Skull size={32} />
        <div>
          <span className="eyebrow">THÍ LUYỆN TAM GIỚI</span>
          <h2>Ba cửa thử đạo tâm</h2>
          <p>
            9 phó bản · 18 thể lực mỗi lượt · Hồi 30 phút. Giữ nguyên sinh lực giữa các cửa; vượt
            cửa cuối nhận trang bị, linh khí và đan dược.
          </p>
        </div>
      </div>
      <div className="expansion-grid">
        {DUNGEONS.map((d) => {
          const locked = s.stage < d.minStage,
            remaining = Math.max(0, (s.dungeons.cooldowns[d.id] || 0) - Date.now());
          return (
            <article className="panel content-card" key={d.id}>
              <div className="dungeon-art">
                <Landscape terrain="temple" night={d.world !== 'earth'} />
                <Skull size={42} />
                <span>{WORLDS.find((w) => w.id === d.world)!.name}</span>
              </div>
              <div className="content-card-body">
                <h3>{d.name}</h3>
                <p>{d.lore}</p>
                <ol className="wave-list">
                  {d.names.map((name, i) => (
                    <li key={name}>
                      <span>{i + 1}</span>
                      {name}
                      {i === 2 && <Crown size={14} />}
                    </li>
                  ))}
                </ol>
                <small>
                  Đã vượt {s.dungeons.clears[d.id] || 0} lượt · {realmName(d.minStage)}
                </small>
                <button
                  className="button primary"
                  disabled={locked || remaining > 0 || !!s.battle || s.stamina < 18}
                  onClick={() => act({ type: 'dungeon', id: d.id })}
                >
                  {locked ? (
                    <>
                      <LockKeyhole size={14} />
                      Chưa khai mở
                    </>
                  ) : remaining > 0 ? (
                    <>
                      <Clock3 size={14} />
                      Hồi {Math.ceil(remaining / 60000)} phút
                    </>
                  ) : (
                    <>
                      <Swords size={14} />
                      Vào phó bản
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
export function CustomSectPanel({ state: s, act }: Props) {
  const [name, setName] = useState(''),
    [leaving, setLeaving] = useState(false);
  const sect = s.customSect;
  return (
    <section className="panel custom-sect-panel">
      <div className="expansion-heading">
        <Castle size={25} />
        <div>
          <span className="eyebrow">KHAI SƠN LẬP PHÁI</span>
          <h2>{sect?.name || 'Sáng lập tông môn của bạn'}</h2>
        </div>
      </div>
      {s.sect && (
        <div className="leave-sect-row">
          <p>
            {s.sect === 'custom'
              ? 'Bạn là tông chủ. Đệ tử được chiêu mộ là NPC của sơn môn.'
              : 'Rời tông môn hiện tại để sáng lập hoặc chọn sơn môn khác.'}
          </p>
          <button className="text-button" onClick={() => setLeaving(!leaving)}>
            Rời tông môn
          </button>
          {leaving && (
            <div className="inline-confirm">
              <span>Rời tông môn sẽ mất cống hiến hiện tại.</span>
              <button className="button secondary" onClick={() => setLeaving(false)}>
                Ở lại
              </button>
              <button
                className="button danger"
                onClick={() => {
                  act({ type: 'leave-sect' });
                  setLeaving(false);
                }}
              >
                Xác nhận rời
              </button>
            </div>
          )}
        </div>
      )}
      {!sect ? (
        <>
          <p>
            Cần Trúc Cơ Sơ kỳ, 600 linh thạch và 10 huyền thiết. Đại điện mở cấp công trình; diễn võ
            trường tăng tu luyện; đan phòng nhận linh thảo khi chiêu mộ.
          </p>
          <form
            className="found-sect-form"
            onSubmit={(e) => {
              e.preventDefault();
              act({ type: 'found-sect', name });
            }}
          >
            <input
              aria-label="Tên tông môn"
              value={name}
              maxLength={24}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên sơn môn của bạn"
            />
            <button className="button primary" disabled={!!s.sect || !!s.battle}>
              Khai sơn lập phái
            </button>
          </form>
        </>
      ) : (
        <>
          <div className="sect-resources">
            <span>
              <Crown size={16} />
              Cấp {sect.level}
            </span>
            <span>
              <Users size={16} />
              {sect.members}/{sect.level * 10} đệ tử NPC
            </span>
            <span>
              <Gem size={16} />
              {fmt(sect.treasury)} ngân khố
            </span>
          </div>
          {s.sect !== 'custom' ? (
            <button
              className="button primary"
              disabled={!!s.sect}
              onClick={() => act({ type: 'join', sectId: 'custom' })}
            >
              Trở về sơn môn
            </button>
          ) : (
            <>
              <div className="building-grid">
                {(['hall', 'training', 'alchemy'] as const).map((id) => {
                  const level = sect.buildings[id],
                    cost = sectBuildCost(level);
                  return (
                    <div className="building-card" key={id}>
                      {id === 'hall' ? <Castle /> : id === 'training' ? <Swords /> : <Leaf />}
                      <h3>
                        {id === 'hall'
                          ? 'Đại điện'
                          : id === 'training'
                            ? 'Diễn võ trường'
                            : 'Đan phòng'}
                      </h3>
                      <span>Cấp {level}/10</span>
                      <p>
                        {id === 'hall'
                          ? `Sinh lực +${level * 3}%, sức chứa ${level * 10} đệ tử`
                          : id === 'training'
                            ? `Tu luyện +${level * 5}%`
                            : `Lễ nhập môn nhận ${level} linh thảo`}
                      </p>
                      <small>
                        {fmt(cost.stones)} ngân khố · {cost.ore} huyền thiết
                      </small>
                      <button
                        className="button secondary"
                        disabled={level === 10 || !!s.battle}
                        onClick={() => act({ type: 'sect-build', building: id })}
                      >
                        Nâng cấp
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="card-actions">
                <button
                  className="button primary"
                  disabled={!!s.battle}
                  onClick={() => act({ type: 'donate' })}
                >
                  Góp 50 linh thạch vào ngân khố
                </button>
                <button
                  className="button secondary"
                  disabled={!!s.battle || sect.members >= sect.level * 10}
                  onClick={() => act({ type: 'recruit' })}
                >
                  Chiêu mộ · 100 ngân khố
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
export function CommunityPanel({
  state: s,
  act,
  community,
  loggedIn,
  onLogin,
}: Props & { community: ReturnType<typeof useCommunity>; loggedIn: boolean; onLogin: () => void }) {
  const [tab, setTab] = useState<'all' | 'online'>('all');
  const data = community.data,
    time = Date.now() + community.clockOffset;
  const players = tab === 'all' ? data?.ranking : data?.topOnline;
  return (
    <>
      <div className="expansion-banner panel">
        <Trophy size={34} />
        <div>
          <span className="eyebrow">THIÊN BẢNG TAM GIỚI</span>
          <h2>Đạo hữu cùng chung tiên lộ</h2>
          <p>
            Xếp theo cảnh giới, tu vi và chiến lực của nhân vật đã đồng bộ. Online là tài khoản hoạt
            động trong 2 phút gần nhất.
          </p>
        </div>
        <span className="online-chip">
          <i />
          {data?.onlineCount ?? '—'} online
        </span>
      </div>
      {community.error && (
        <div className="community-message" role="status">
          {community.error}
          <button className="text-button" onClick={() => void community.refresh()}>
            Thử lại
          </button>
        </div>
      )}
      {!loggedIn && (
        <button className="button primary" onClick={onLogin}>
          Đăng nhập để lên bảng và tham chiến
        </button>
      )}
      <section className="panel ranking-panel">
        <div className="expansion-heading">
          <h2>Bảng xếp hạng</h2>
          <div className="filter-tabs">
            <button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')}>
              Toàn máy chủ
            </button>
            <button className={tab === 'online' ? 'active' : ''} onClick={() => setTab('online')}>
              Top online
            </button>
          </div>
        </div>
        {players?.length ? (
          <div className="ranking-list">
            {players.map((p) => (
              <div key={p.id} className={`ranking-row ${p.self ? 'self' : ''}`}>
                <b className={`rank-medal rank-${p.rank}`}>
                  {p.rank <= 3 ? <Trophy size={19} /> : p.rank}
                  <small>{p.rank <= 3 ? p.rank : ''}</small>
                </b>
                <div>
                  <strong>
                    {p.name}
                    {p.self && <span className="tiny-label">Bạn</span>}
                    {p.online && <i className="online-dot" />}
                  </strong>
                  <span>
                    {realmName(p.stage)} · {p.sect}
                  </span>
                </div>
                <div>
                  <strong>{fmt(p.power)}</strong>
                  <span>chiến lực · {p.clears} phó bản</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="community-empty">
            <Users size={34} />
            <h3>
              {data ? 'Chưa có đạo hữu trong danh sách' : 'Kết nối máy chủ để xem thiên bảng'}
            </h3>
            <p>Đăng nhập, đồng bộ nhân vật và quay lại để theo dõi thứ hạng.</p>
          </div>
        )}
      </section>
      <div className="expansion-heading">
        <Flame size={25} />
        <div>
          <span className="eyebrow">ĐẠI CHIẾN THẾ GIỚI</span>
          <h2>Boss hồi sinh mỗi giờ</h2>
          <p>
            Mỗi boss hiện thế 15 phút. Sát thương và phần thưởng do máy chủ lưu, mỗi đòn cách nhau 5
            giây.
          </p>
        </div>
      </div>
      <div className="expansion-grid">
        {data?.bosses.map((b) => {
          const locked = s.stage < b.minStage,
            waiting = Math.max(0, b.nextHitAt - time);
          return (
            <article key={b.id} className="panel content-card world-boss-card">
              <div className={`rune-art ${b.world}`}>
                <Skull size={65} strokeWidth={0.8} />
                <b>{b.symbol}</b>
                <span>{WORLDS.find((w) => w.id === b.world)!.name}</span>
              </div>
              <div className="content-card-body">
                <span className={`tag ${b.active ? 'green' : ''}`}>
                  {b.active ? 'Đang hiện thế' : b.hp === 0 ? 'Đã bị đánh bại' : 'Đang ngủ'}
                </span>
                <h3>{b.name}</h3>
                <p>
                  {realmName(b.stage)} · {b.participants} đạo hữu tham chiến
                </p>
                <div
                  className="progress"
                  role="progressbar"
                  aria-label={`Sinh lực ${b.name}`}
                  aria-valuenow={Math.round((b.hp / b.maxHp) * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span style={{ width: `${(b.hp / b.maxHp) * 100}%` }} />
                </div>
                <small>
                  {fmt(b.hp)}/{fmt(b.maxHp)} sinh lực · Bạn gây {fmt(b.damage)} sát thương
                </small>
                <p className="boss-timer">
                  <Clock3 size={14} />
                  {b.active ? 'Rời thế giới' : 'Hồi sinh'} lúc{' '}
                  {new Date(b.active ? b.endsAt : b.respawnsAt).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Ho_Chi_Minh',
                  })}{' '}
                  (VN)
                </p>
                <button
                  className="button primary"
                  disabled={
                    !loggedIn ||
                    !b.active ||
                    locked ||
                    community.working ||
                    waiting > 0 ||
                    !!s.battle
                  }
                  onClick={() => {
                    if (s.training.active) act({ type: 'stop-training' });
                    void community.interact(b.id, b.cycle);
                  }}
                >
                  <Swords size={15} />
                  {locked
                    ? 'Chưa đủ tu vi'
                    : waiting > 0
                      ? `Hồi chiêu ${Math.ceil(waiting / 1000)}s`
                      : 'Công kích boss'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {data?.rewards.map((r) => (
        <div className="panel boss-reward" key={`${r.bossId}-${r.cycle}`}>
          <Sparkles size={22} />
          <div>
            <strong>Chiến lợi phẩm {r.name}</strong>
            <p>Nhận linh thạch, linh khí và 3 tinh hoa. Phần thưởng lưu 7 ngày.</p>
          </div>
          <button
            className="button primary"
            disabled={community.working || !!s.battle}
            onClick={() => {
              if (s.training.active) act({ type: 'stop-training' });
              void community.interact(r.bossId, r.cycle, true);
            }}
          >
            Nhận chiến lợi phẩm
          </button>
        </div>
      ))}
    </>
  );
}
