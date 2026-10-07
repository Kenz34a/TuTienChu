import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Gift,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  MessageCircle,
  Moon,
  RefreshCw,
  ScrollText,
  ShieldCheck,
  Skull,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { api, defaultServer, readAccount, type CloudSave } from './cloud/client';
import { useTheme } from './useTheme';
import { ITEMS, RANKS, SLOTS, realmName } from './game/data';
import { MAX_STAGE } from './game/stages';
import { decodeSave } from './game/storage';
import type { GameState, ItemId } from './game/types';
import { rewardText, type GiftCode, type GiftReward } from './game/gifts';
import type { ServerStatus } from './cloud/useServerStatus';
import type { WorldBoss } from './cloud/useCommunity';
import './admin.css';

interface Session {
  server: string;
  token: string;
  username: string;
}
interface Overview {
  user: { id: string; username: string };
  accounts: number;
  characters: number;
  codes: number;
  claims: number;
  banned: number;
  server: ServerStatus;
}
interface Player {
  id: string;
  username: string;
  name: string | null;
  stage: number | null;
  role: string;
  banned: number;
  reason: string;
  updatedAt: number;
}
interface Selected {
  user: { id: string; username: string; role: string; banned?: number; reason?: string };
  cloud: CloudSave;
}
interface Payload {
  total?: number;
  codes?: GiftCode[];
  players?: Player[];
  receipts?: { code: string; label: string; username: string; time: number }[];
  messages?: {
    id: number;
    username: string;
    name: string;
    world: string;
    body: string;
    time: number;
  }[];
  bosses?: WorldBoss[];
  entries?: {
    id: number;
    actor: string;
    action: string;
    target: string;
    details: string;
    time: number;
    restorable: number;
  }[];
}
const SESSION_KEY = 'van-tien-ky.admin.session.v1';
const tabs = [
  { id: 'overview', label: 'Máy chủ', icon: LayoutDashboard },
  { id: 'players', label: 'Người chơi', icon: Users },
  { id: 'giftcodes', label: 'Giftcode', icon: Gift },
  { id: 'redemptions', label: 'Lịch sử quà', icon: ScrollText },
  { id: 'bosses', label: 'Boss thế giới', icon: Skull },
  { id: 'chat', label: 'Quản lý chat', icon: MessageCircle },
  { id: 'audit', label: 'Nhật ký admin', icon: ShieldCheck },
] as const;
type Tab = (typeof tabs)[number]['id'];
function readSession(): Session | null {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    if (
      s &&
      typeof s.server === 'string' &&
      /^[\w-]{43}$/.test(s.token) &&
      typeof s.username === 'string'
    )
      return s;
  } catch {
    /* Login remains available. */
  }
  const a = readAccount();
  return a ? { server: a.server, token: a.token, username: a.username } : null;
}
const time = (n: number) => new Date(n).toLocaleString('vi-VN');
const allStages = Array.from({ length: MAX_STAGE + 1 }, (_, i) => i);
function RewardEditor({
  value: r,
  onChange,
}: {
  value: GiftReward;
  onChange: (r: GiftReward) => void;
}) {
  return (
    <div className="admin-reward-editor">
      <div className="admin-field-grid">
        {(
          [
            ['stones', 'Linh thạch'],
            ['immortal', 'Tiên thạch'],
            ['divine', 'Thần thạch'],
            ['lingqi', 'Linh khí'],
          ] as const
        ).map(([id, label]) => (
          <label key={id}>
            {label}
            <input
              type="number"
              min={0}
              max={1000000}
              step={1}
              value={r[id] || 0}
              onChange={(e) => onChange({ ...r, [id]: Number(e.target.value) })}
            />
          </label>
        ))}
        {(Object.keys(ITEMS) as ItemId[]).map((id) => (
          <label key={id}>
            {ITEMS[id].name}
            <input
              type="number"
              min={0}
              max={10000}
              step={1}
              value={r.items?.[id] || 0}
              onChange={(e) =>
                onChange({ ...r, items: { ...r.items, [id]: Number(e.target.value) } })
              }
            />
          </label>
        ))}
      </div>
      <label className="admin-checkbox">
        <input
          type="checkbox"
          checked={!!r.gear}
          onChange={(e) =>
            onChange({
              ...r,
              gear: e.target.checked ? { slot: 'robe', rank: 0, level: 0 } : undefined,
            })
          }
        />
        Tặng thêm một trang bị
      </label>
      {r.gear && (
        <div className="admin-field-grid">
          <label>
            Loại trang bị
            <select
              value={r.gear.slot}
              onChange={(e) =>
                onChange({ ...r, gear: { ...r.gear!, slot: e.target.value as typeof r.gear.slot } })
              }
            >
              {SLOTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Phẩm
            <select
              value={r.gear.rank}
              onChange={(e) =>
                onChange({ ...r, gear: { ...r.gear!, rank: Number(e.target.value) } })
              }
            >
              {RANKS.map((p, i) => (
                <option key={p.name} value={i}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cường hóa
            <input
              type="number"
              min={0}
              max={10}
              value={r.gear.level}
              onChange={(e) =>
                onChange({ ...r, gear: { ...r.gear!, level: Number(e.target.value) } })
              }
            />
          </label>
        </div>
      )}
      <p className="admin-reward-preview">{rewardText(r) || 'Chưa chọn phần thưởng'}</p>
    </div>
  );
}
export function AdminPage() {
  const appearance = useTheme(),
    [session, setSession] = useState<Session | null>(readSession),
    [username, setUsername] = useState(''),
    [password, setPassword] = useState('');
  const [tab, setTab] = useState<Tab>('overview'),
    [overview, setOverview] = useState<Overview | null>(null),
    [data, setData] = useState<Payload>({}),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(''),
    [term, setTerm] = useState(''),
    [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(false),
    [working, setWorking] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const current = useRef(session);
  current.current = session;
  const request = useRef(0);
  const [serverMessage, setServerMessage] = useState(''),
    [maintenance, setMaintenance] = useState(false);
  const [giftForm, setGiftForm] = useState({
      code: '',
      label: '',
      minStage: 0,
      maxClaims: '',
      startsAt: '',
      expiresAt: '',
    }),
    [giftReward, setGiftReward] = useState<GiftReward>({ stones: 500 });
  const [selected, setSelected] = useState<Selected | null>(null),
    [edit, setEdit] = useState<GameState | null>(null),
    [json, setJson] = useState(''),
    [raw, setRaw] = useState(false),
    [grant, setGrant] = useState<GiftReward>({ stones: 500 }),
    [reason, setReason] = useState(''),
    [newPassword, setNewPassword] = useState('');
  const selectedId = useRef('');
  const [confirm, setConfirm] = useState<{
    title: string;
    text: string;
    run: () => Promise<void>;
  } | null>(null);
  const remember = (s: Session | null) => {
    setSession(s);
    current.current = s;
    try {
      if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* Memory session still works. */
    }
  };
  const loadPlayer = async (id: string) => {
    const a = current.current;
    if (!a) return;
    selectedId.current = id;
    setError('');
    const r = await api<Selected>(a.server, `/admin/players/${encodeURIComponent(id)}`, a.token);
    if (current.current?.token !== a.token || selectedId.current !== id) return;
    setSelected(r);
    setEdit(r.cloud.state);
    setJson(JSON.stringify(r.cloud.state, null, 2));
    setRaw(false);
    setReason(r.user.reason || '');
    setNewPassword('');
  };
  useEffect(() => {
    const a = session,
      epoch = ++request.current;
    setData({});
    setOverview(null);
    if (!a) return;
    setLoading(true);
    setError('');
    const path =
      tab === 'overview'
        ? null
        : `/admin/${tab}?page=${page}${tab === 'players' ? `&search=${encodeURIComponent(term)}` : ''}`;
    void Promise.all([
      api<Overview>(a.server, '/admin/overview', a.token),
      path ? api<Payload>(a.server, path, a.token) : Promise.resolve({}),
    ])
      .then(([o, d]) => {
        if (request.current !== epoch) return;
        setOverview(o);
        setData(d);
        setServerMessage(o.server.message);
        setMaintenance(o.server.maintenance);
      })
      .catch((e) => {
        if (request.current !== epoch) return;
        setError(e.message);
        if (e.status === 401 || e.status === 403) remember(null);
      })
      .finally(() => {
        if (request.current === epoch) setLoading(false);
      });
    return () => {
      request.current++;
    };
  }, [session, tab, page, term, reload]);
  const run = async (
    path: string,
    body: unknown,
    method = 'POST',
    message = 'Đã lưu thay đổi.',
  ) => {
    const a = current.current;
    if (!a || working) return;
    setWorking(true);
    setError('');
    setNotice('');
    try {
      await api(a.server, path, a.token, body, method);
      if (current.current?.token !== a.token) return;
      setNotice(message);
      setReload((k) => k + 1);
      if (selectedId.current && tab === 'players') await loadPlayer(selectedId.current);
    } catch (e) {
      if (current.current?.token === a.token)
        setError(e instanceof Error ? e.message : 'Chưa thực hiện được thay đổi.');
    } finally {
      setWorking(false);
      setConfirm(null);
    }
  };
  const login = async () => {
    setWorking(true);
    setError('');
    try {
      const server = defaultServer(),
        r = await api<{ token: string; user: { username: string } }>(
          server,
          '/auth/login',
          undefined,
          { username, password },
        );
      try {
        await api<Overview>(server, '/admin/overview', r.token);
      } catch (e) {
        await api(server, '/logout', r.token, {}).catch(() => {});
        throw e;
      }
      remember({ server, token: r.token, username: r.user.username });
      setPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đăng nhập thất bại.');
    } finally {
      setWorking(false);
    }
  };
  const logout = async () => {
    const a = current.current;
    remember(null);
    setSelected(null);
    selectedId.current = '';
    setOverview(null);
    setNotice('');
    if (a) await api(a.server, '/logout', a.token, {}).catch(() => {});
  };
  const changeTab = (id: Tab) => {
    setTab(id);
    setPage(1);
    setSelected(null);
    selectedId.current = '';
    setNotice('');
  };
  const savePlayer = () => {
    if (!selected || !edit) return;
    let state: unknown = edit;
    try {
      if (raw) state = JSON.parse(json);
    } catch {
      setError('JSON chưa hợp lệ. Chưa gửi thay đổi.');
      return;
    }
    const target = selected;
    setConfirm({
      title: `Lưu nhân vật ${target.user.username}`,
      text: 'Ghi bản chỉnh sửa lên máy chủ, cập nhật bảng xếp hạng và lưu bản trước đó trong nhật ký. Thiết bị người chơi cần đồng bộ bản trên tài khoản.',
      run: () =>
        run(
          `/admin/players/${target.user.id}/save`,
          { revision: target.cloud.revision, state },
          'PUT',
        ),
    });
  };
  const createGift = async () => {
    await run(
      '/admin/giftcodes',
      {
        ...giftForm,
        minStage: giftForm.minStage,
        maxClaims: giftForm.maxClaims ? Number(giftForm.maxClaims) : null,
        startsAt: giftForm.startsAt ? new Date(giftForm.startsAt).getTime() : undefined,
        expiresAt: giftForm.expiresAt ? new Date(giftForm.expiresAt).getTime() : null,
        reward: giftReward,
      },
      'POST',
      'Đã tạo giftcode. Mã mới nằm đầu danh sách bên dưới.',
    );
  };
  const pagination =
    data.total !== undefined && data.total > 25 ? (
      <div className="admin-pagination">
        <button
          className="button secondary"
          disabled={page === 1 || loading}
          onClick={() => setPage((p) => p - 1)}
        >
          Trang trước
        </button>
        <span>
          Trang {page}/{Math.ceil(data.total / 25)} · {data.total} mục
        </span>
        <button
          className="button secondary"
          disabled={page * 25 >= data.total || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Trang sau
        </button>
      </div>
    ) : null;
  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <a href="/" className="admin-brand">
          <ShieldCheck size={29} />
          <div>
            <strong>Thiên Đạo Các</strong>
            <small>QUẢN TRỊ MÁY CHỦ</small>
          </div>
        </a>
        <div>
          <a className="button secondary" href="/">
            <ArrowLeft size={16} />
            Về game
          </a>
          <button
            className="icon-button"
            aria-label={appearance.theme === 'dark' ? 'Bật giao diện sáng' : 'Bật giao diện tối'}
            onClick={appearance.toggle}
          >
            {appearance.theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          {session && (
            <button className="button secondary" onClick={() => void logout()}>
              <LogOut size={16} />
              Đăng xuất admin
            </button>
          )}
        </div>
      </header>
      {!session ? (
        <main className="admin-login panel">
          <LockKeyhole size={43} />
          <span className="eyebrow">CHỈ DÀNH CHO NGƯỜI ĐIỀU HÀNH</span>
          <h1>Đăng nhập quản trị</h1>
          <p>Dùng tài khoản đã được cấp quyền admin trên máy chủ này.</p>
          {error && (
            <div className="admin-error" role="alert">
              {error}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void login();
            }}
          >
            <label>
              Tài khoản admin
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                required
              />
            </label>
            <label>
              Mật khẩu
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                minLength={10}
                required
              />
            </label>
            <button className="button primary" disabled={working}>
              {working ? 'Đang kiểm tra quyền' : 'Vào trang quản trị'}
            </button>
          </form>
          <p>
            Tạo tài khoản trong game trước. Chủ máy chủ cấp quyền bằng lệnh{' '}
            <code>npm run admin -- grant ten_tai_khoan</code>.
          </p>
        </main>
      ) : (
        <>
          <nav className="admin-tabs" aria-label="Điều hướng quản trị">
            {tabs.map((t) => (
              <button
                key={t.id}
                className={tab === t.id ? 'active' : ''}
                aria-current={tab === t.id ? 'page' : undefined}
                onClick={() => changeTab(t.id)}
              >
                <t.icon size={17} />
                {t.label}
              </button>
            ))}
          </nav>
          <main className="admin-content">
            <div className="admin-page-heading">
              <div>
                <span className="eyebrow">ADMIN · {session.username}</span>
                <h1>{tabs.find((t) => t.id === tab)!.label}</h1>
              </div>
              <button
                className="button secondary"
                disabled={loading || working}
                onClick={() => setReload((k) => k + 1)}
              >
                <RefreshCw size={16} />
                Tải lại dữ liệu
              </button>
            </div>
            {error && (
              <div className="admin-error" role="alert">
                {error}
              </div>
            )}
            {notice && (
              <div className="admin-success" role="status">
                {notice}
              </div>
            )}
            {loading && (
              <p className="admin-loading" role="status">
                Đang tải dữ liệu máy chủ…
              </p>
            )}
            {overview && tab === 'overview' && (
              <>
                <div className="admin-metrics">
                  {[
                    ['Tài khoản', overview.accounts],
                    ['Nhân vật', overview.characters],
                    ['Giftcode', overview.codes],
                    ['Lượt nhận quà', overview.claims],
                    ['Tài khoản khóa', overview.banned],
                  ].map(([label, n]) => (
                    <section className="panel" key={label}>
                      <span>{label}</span>
                      <strong>{Number(n).toLocaleString('vi-VN')}</strong>
                    </section>
                  ))}
                </div>
                <section className="panel admin-card">
                  <h2>Điều hành máy chủ</h2>
                  <p>
                    Thông báo xuất hiện trong game trên web và app. Chế độ bảo trì tạm dừng đồng bộ,
                    chat và nhận thưởng của người chơi; trang admin tiếp tục hoạt động.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setConfirm({
                        title: 'Cập nhật máy chủ',
                        text: maintenance
                          ? 'Bật bảo trì: người chơi tiếp tục lưu cục bộ nhưng tạm ngừng thao tác máy chủ.'
                          : 'Lưu thông báo và mở lại các thao tác máy chủ cho người chơi.',
                        run: () =>
                          run(
                            '/admin/server',
                            {
                              revision: overview.server.revision,
                              maintenance,
                              message: serverMessage,
                            },
                            'PUT',
                          ),
                      });
                    }}
                  >
                    <label>
                      Thông báo toàn máy chủ
                      <textarea
                        rows={4}
                        maxLength={500}
                        value={serverMessage}
                        onChange={(e) => setServerMessage(e.target.value)}
                        placeholder="Lịch bảo trì, sự kiện hoặc lời chào đạo hữu…"
                      />
                    </label>
                    <label className="admin-checkbox">
                      <input
                        type="checkbox"
                        checked={maintenance}
                        onChange={(e) => setMaintenance(e.target.checked)}
                      />
                      Bật chế độ bảo trì
                    </label>
                    <button className="button primary" disabled={working}>
                      Lưu cấu hình máy chủ
                    </button>
                  </form>
                </section>
                <section className="panel admin-card">
                  <h2>Toàn quyền điều hành trong game</h2>
                  <p>
                    Người chơi: cộng thạch và vật phẩm, chỉnh mọi trường nhân vật bằng biểu
                    mẫu/JSON, khóa tài khoản, đổi mật khẩu, thu hồi phiên và cấp quyền admin.
                    Giftcode: phát hành, hẹn giờ, giới hạn lượt và tắt mã. Boss: hồi sinh, hồi sinh
                    lực hoặc kết liễu. Chat: gỡ tin vi phạm. Nhật ký: xem hoạt động và khôi phục
                    nhân vật trước khi sửa.
                  </p>
                  <p>
                    Thay đổi nhân vật dùng phiên bản bản lưu; dữ liệu mới từ thiết bị khác sẽ yêu
                    cầu tải lại để tránh ghi đè. Không thể khóa hoặc gỡ quyền admin cuối cùng.
                  </p>
                </section>
              </>
            )}
            {overview && tab === 'giftcodes' && (
              <>
                <section className="panel admin-card">
                  <h2>Phát hành giftcode</h2>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void createGift();
                    }}
                  >
                    <div className="admin-field-grid">
                      <label>
                        Mã quà tặng
                        <input
                          value={giftForm.code}
                          maxLength={40}
                          onChange={(e) => setGiftForm({ ...giftForm, code: e.target.value })}
                          placeholder="Để trống để tạo mã ngẫu nhiên"
                          autoCapitalize="characters"
                        />
                      </label>
                      <label>
                        Tên gói quà
                        <input
                          value={giftForm.label}
                          maxLength={80}
                          onChange={(e) => setGiftForm({ ...giftForm, label: e.target.value })}
                          placeholder="Quà khai mở tiên lộ"
                          required
                        />
                      </label>
                      <label>
                        Tu vi tối thiểu
                        <select
                          value={giftForm.minStage}
                          onChange={(e) =>
                            setGiftForm({ ...giftForm, minStage: Number(e.target.value) })
                          }
                        >
                          {allStages.map((i) => (
                            <option key={i} value={i}>
                              {realmName(i)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Tổng lượt nhận
                        <input
                          type="number"
                          min={1}
                          max={1000000}
                          value={giftForm.maxClaims}
                          onChange={(e) => setGiftForm({ ...giftForm, maxClaims: e.target.value })}
                          placeholder="Không giới hạn"
                        />
                      </label>
                      <label>
                        Mở từ lúc
                        <input
                          type="datetime-local"
                          value={giftForm.startsAt}
                          onChange={(e) => setGiftForm({ ...giftForm, startsAt: e.target.value })}
                        />
                      </label>
                      <label>
                        Hết hạn lúc
                        <input
                          type="datetime-local"
                          value={giftForm.expiresAt}
                          onChange={(e) => setGiftForm({ ...giftForm, expiresAt: e.target.value })}
                        />
                      </label>
                    </div>
                    <h3>Phần thưởng</h3>
                    <RewardEditor value={giftReward} onChange={setGiftReward} />
                    <button className="button primary" disabled={working}>
                      Tạo giftcode
                    </button>
                  </form>
                </section>
                <div className="admin-code-list">
                  {data.codes?.map((g) => (
                    <article className="panel admin-code-card" key={g.id}>
                      <div>
                        <code>{g.code}</code>
                        <h3>{g.label}</h3>
                        <p>{rewardText(g.reward)}</p>
                        <small>
                          {realmName(g.minStage)} trở lên · Đã nhận {g.claims}/{g.maxClaims ?? '∞'}
                        </small>
                        <small>
                          Mở: {time(g.startsAt)} ·{' '}
                          {g.expiresAt ? `Hết hạn: ${time(g.expiresAt)}` : 'Không hết hạn'}
                        </small>
                      </div>
                      <button
                        className="button secondary"
                        disabled={working}
                        onClick={() =>
                          setConfirm({
                            title: `${g.enabled ? 'Tắt' : 'Mở'} mã ${g.code}`,
                            text: 'Lịch sử đã nhận và phần thưởng của mã được giữ nguyên.',
                            run: () =>
                              run(`/admin/giftcodes/${g.id}/status`, { enabled: !g.enabled }),
                          })
                        }
                      >
                        {g.enabled ? 'Tắt giftcode' : 'Mở giftcode'}
                      </button>
                    </article>
                  ))}
                </div>
                {!data.codes?.length && !loading && (
                  <p>Chưa có giftcode. Tạo mã đầu tiên ở biểu mẫu trên.</p>
                )}
                {pagination}
              </>
            )}
            {overview && tab === 'players' && (
              <>
                <form
                  className="admin-search"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setTerm(search);
                    setPage(1);
                  }}
                >
                  <input
                    aria-label="Tìm người chơi"
                    placeholder="Tên tài khoản hoặc đạo hiệu"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <button className="button primary">Tìm người chơi</button>
                </form>
                <div className="admin-table-wrap panel">
                  <table>
                    <thead>
                      <tr>
                        <th>Tài khoản</th>
                        <th>Nhân vật</th>
                        <th>Quyền</th>
                        <th>Trạng thái</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {data.players?.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.username}</strong>
                          </td>
                          <td>
                            {p.name || 'Chưa đồng bộ'}
                            <small>{p.stage !== null ? realmName(p.stage) : ''}</small>
                          </td>
                          <td>{p.role}</td>
                          <td>{p.banned ? 'Đã khóa' : 'Hoạt động'}</td>
                          <td>
                            <button
                              className="button secondary"
                              onClick={() =>
                                void loadPlayer(p.id).catch((e) => setError(e.message))
                              }
                            >
                              Điều hành
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pagination}
                {selected && (
                  <section
                    className="panel admin-card admin-player-detail"
                    aria-label={`Điều hành ${selected.user.username}`}
                  >
                    <div className="admin-page-heading">
                      <h2>
                        {selected.user.username} · Bản lưu #{selected.cloud.revision}
                      </h2>
                      <button
                        className="icon-button"
                        aria-label="Đóng điều hành người chơi"
                        onClick={() => {
                          setSelected(null);
                          selectedId.current = '';
                        }}
                      >
                        <X size={19} />
                      </button>
                    </div>
                    {edit ? (
                      <>
                        <div className="admin-editor-tabs">
                          <button
                            className="button secondary"
                            aria-pressed={!raw}
                            onClick={() => {
                              if (raw) {
                                try {
                                  setEdit(decodeSave(json));
                                } catch {
                                  setError(
                                    'Bản lưu JSON chưa hợp lệ. Hãy sửa trước khi chuyển biểu mẫu.',
                                  );
                                  return;
                                }
                              }
                              setRaw(false);
                            }}
                          >
                            Biểu mẫu nhân vật
                          </button>
                          <button
                            className="button secondary"
                            aria-pressed={raw}
                            onClick={() => {
                              if (!raw) setJson(JSON.stringify(edit, null, 2));
                              setRaw(true);
                            }}
                          >
                            Toàn bộ bản lưu JSON
                          </button>
                        </div>
                        {raw ? (
                          <label>
                            Bản lưu nhân vật
                            <textarea
                              className="admin-json"
                              rows={18}
                              value={json}
                              onChange={(e) => setJson(e.target.value)}
                              spellCheck={false}
                            />
                          </label>
                        ) : (
                          <div className="admin-field-grid">
                            <label>
                              Đạo hiệu
                              <input
                                value={edit.name}
                                maxLength={24}
                                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                              />
                            </label>
                            <label>
                              Cảnh giới
                              <select
                                value={edit.stage}
                                onChange={(e) =>
                                  setEdit({ ...edit, stage: Number(e.target.value) })
                                }
                              >
                                {allStages.map((i) => (
                                  <option key={i} value={i}>
                                    {realmName(i)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            {(
                              [
                                ['stones', 'Tổng linh thạch'],
                                ['lingqi', 'Tổng linh khí'],
                                ['xp', 'Tổng tu vi'],
                              ] as const
                            ).map(([key, label]) => (
                              <label key={key}>
                                {label}
                                <input
                                  type="number"
                                  min={0}
                                  value={edit[key]}
                                  onChange={(e) =>
                                    setEdit({ ...edit, [key]: Number(e.target.value) })
                                  }
                                />
                              </label>
                            ))}
                            {(
                              [
                                ['immortal', 'Tổng tiên thạch'],
                                ['divine', 'Tổng thần thạch'],
                              ] as const
                            ).map(([key, label]) => (
                              <label key={key}>
                                {label}
                                <input
                                  type="number"
                                  min={0}
                                  max={1000000000}
                                  value={edit.wallet[key]}
                                  onChange={(e) =>
                                    setEdit({
                                      ...edit,
                                      wallet: { ...edit.wallet, [key]: Number(e.target.value) },
                                    })
                                  }
                                />
                              </label>
                            ))}
                          </div>
                        )}
                        <button className="button primary" disabled={working} onClick={savePlayer}>
                          Lưu nhân vật
                        </button>
                        <details className="admin-grant">
                          <summary>Cộng thạch, linh khí, vật phẩm và trang bị</summary>
                          <RewardEditor value={grant} onChange={setGrant} />
                          <button
                            className="button primary"
                            disabled={working}
                            onClick={() =>
                              setConfirm({
                                title: `Cộng quà cho ${selected.user.username}`,
                                text: rewardText(grant),
                                run: () =>
                                  run(`/admin/players/${selected.user.id}/grant`, {
                                    revision: selected.cloud.revision,
                                    reward: grant,
                                  }),
                              })
                            }
                          >
                            Cộng quà vào tài khoản
                          </button>
                        </details>
                      </>
                    ) : (
                      <p>Tài khoản chưa có nhân vật. Người chơi cần đồng bộ trước.</p>
                    )}
                    <div className="admin-account-controls">
                      <h3>Quyền và truy cập</h3>
                      <label>
                        Lý do khóa
                        <input
                          value={reason}
                          maxLength={200}
                          onChange={(e) => setReason(e.target.value)}
                        />
                      </label>
                      <div className="admin-button-row">
                        <button
                          className="button secondary"
                          disabled={working}
                          onClick={() =>
                            setConfirm({
                              title: `${selected.user.banned ? 'Mở khóa' : 'Khóa'} ${selected.user.username}`,
                              text: selected.user.banned
                                ? 'Cho phép đăng nhập và chơi lại.'
                                : 'Thu hồi phiên hiện tại và chặn đăng nhập cho đến khi mở khóa.',
                              run: () =>
                                run(`/admin/players/${selected.user.id}/control`, {
                                  banned: !selected.user.banned,
                                  reason,
                                }),
                            })
                          }
                        >
                          {selected.user.banned ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                        </button>
                        <button
                          className="button secondary"
                          disabled={working}
                          onClick={() =>
                            setConfirm({
                              title: `Đổi quyền ${selected.user.username}`,
                              text:
                                selected.user.role === 'admin'
                                  ? 'Gỡ quyền điều hành máy chủ.'
                                  : 'Cấp toàn quyền điều hành máy chủ cho tài khoản này.',
                              run: () =>
                                run(`/admin/players/${selected.user.id}/role`, {
                                  role: selected.user.role === 'admin' ? 'player' : 'admin',
                                }),
                            })
                          }
                        >
                          {selected.user.role === 'admin' ? 'Gỡ quyền admin' : 'Cấp quyền admin'}
                        </button>
                        <button
                          className="button secondary"
                          disabled={working}
                          onClick={() =>
                            setConfirm({
                              title: `Đăng xuất ${selected.user.username} khỏi mọi thiết bị`,
                              text: 'Người chơi cần đăng nhập lại để tiếp tục sử dụng máy chủ.',
                              run: () => run(`/admin/players/${selected.user.id}/sessions`, {}),
                            })
                          }
                        >
                          Thu hồi mọi phiên
                        </button>
                      </div>
                      <label>
                        Mật khẩu mới
                        <input
                          type="password"
                          autoComplete="new-password"
                          minLength={10}
                          maxLength={128}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </label>
                      <button
                        className="button secondary"
                        disabled={working || newPassword.length < 10}
                        onClick={() =>
                          setConfirm({
                            title: `Đổi mật khẩu ${selected.user.username}`,
                            text: 'Thu hồi mọi phiên. Mật khẩu mới không được ghi vào nhật ký.',
                            run: () =>
                              run(`/admin/players/${selected.user.id}/password`, {
                                password: newPassword,
                              }),
                          })
                        }
                      >
                        Đặt mật khẩu mới
                      </button>
                    </div>
                  </section>
                )}
              </>
            )}
            {overview && tab === 'redemptions' && (
              <>
                <div className="admin-table-wrap panel">
                  <table>
                    <thead>
                      <tr>
                        <th>Giftcode</th>
                        <th>Người nhận</th>
                        <th>Thời gian</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.receipts?.map((r, i) => (
                        <tr key={`${r.code}-${r.username}-${i}`}>
                          <td>
                            <code>{r.code}</code>
                            <small>{r.label}</small>
                          </td>
                          <td>{r.username}</td>
                          <td>{time(r.time)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pagination}
              </>
            )}
            {overview && tab === 'bosses' && (
              <div className="admin-boss-list">
                {data.bosses?.map((b) => (
                  <section className="panel admin-card" key={b.id}>
                    <h2>{b.name}</h2>
                    <p>
                      {b.hp.toLocaleString('vi-VN')} / {b.maxHp.toLocaleString('vi-VN')} sinh lực ·{' '}
                      {b.active ? 'Đang xuất hiện' : 'Đang nghỉ hoặc đã hạ'}
                    </p>
                    <p>
                      Chu kỳ #{b.cycle} · Hồi sinh theo lịch lúc {time(b.respawnsAt)}
                    </p>
                    <div className="admin-button-row">
                      {(
                        [
                          ['respawn', 'Hồi sinh ngay'],
                          ['heal', 'Hồi đầy sinh lực'],
                          ['defeat', 'Kết liễu boss'],
                        ] as const
                      ).map(([action, label]) => (
                        <button
                          key={action}
                          className="button secondary"
                          disabled={working}
                          onClick={() =>
                            setConfirm({
                              title: `${label}: ${b.name}`,
                              text:
                                action === 'respawn'
                                  ? 'Mở chu kỳ mới; người chơi tham gia lại. Lịch hồi sinh định kỳ vẫn được giữ.'
                                  : action === 'defeat'
                                    ? 'Sinh lực về 0; người đã đóng góp có thể nhận thưởng chu kỳ này.'
                                    : 'Giữ chu kỳ và đóng góp hiện tại, hồi sinh lực về tối đa.',
                              run: () => run(`/admin/bosses/${b.id}`, { action }),
                            })
                          }
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
            {overview && tab === 'chat' && (
              <section className="panel admin-card">
                <h2>100 tin gần nhất trên máy chủ</h2>
                {data.messages?.map((m) => (
                  <article className="admin-chat-row" key={m.id}>
                    <div>
                      <strong>
                        {m.name} · {m.username}
                      </strong>
                      <small>
                        {m.world} · {time(m.time)}
                      </small>
                      <p>{m.body}</p>
                    </div>
                    <button
                      className="button secondary"
                      disabled={working}
                      onClick={() =>
                        setConfirm({
                          title: `Gỡ tin #${m.id}`,
                          text: 'Nội dung được giữ trong nhật ký quản trị để tra cứu.',
                          run: () => run(`/admin/chat/${m.id}/remove`, {}),
                        })
                      }
                    >
                      Gỡ tin
                    </button>
                  </article>
                ))}
              </section>
            )}
            {overview && tab === 'audit' && (
              <>
                <div className="admin-table-wrap panel">
                  <table>
                    <thead>
                      <tr>
                        <th>Thời gian / Admin</th>
                        <th>Hành động</th>
                        <th>Chi tiết</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {data.entries?.map((e) => (
                        <tr key={e.id}>
                          <td>
                            {time(e.time)}
                            <small>{e.actor}</small>
                          </td>
                          <td>
                            {e.action}
                            <small title={e.target}>
                              {e.target.length > 20 ? e.target.slice(0, 12) + '…' : e.target}
                            </small>
                          </td>
                          <td>{e.details}</td>
                          <td>
                            {!!e.restorable && (
                              <button
                                className="button secondary"
                                disabled={working}
                                onClick={() =>
                                  setConfirm({
                                    title: `Khôi phục bản trước lần sửa #${e.id}`,
                                    text: 'Ghi bản trước lần sửa này lên nhân vật. Nếu tiến trình đổi trong lúc khôi phục, máy chủ sẽ yêu cầu tải lại.',
                                    run: async () => {
                                      const a = current.current;
                                      if (!a) return;
                                      try {
                                        const p = await api<Selected>(
                                          a.server,
                                          `/admin/players/${e.target}`,
                                          a.token,
                                        );
                                        await run(`/admin/audit/${e.id}/restore`, {
                                          revision: p.cloud.revision,
                                        });
                                      } catch (err) {
                                        setError(
                                          err instanceof Error
                                            ? err.message
                                            : 'Không khôi phục được.',
                                        );
                                        setConfirm(null);
                                      }
                                    },
                                  })
                                }
                              >
                                Khôi phục nhân vật
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pagination}
              </>
            )}
          </main>
        </>
      )}
      {confirm && (
        <div className="admin-modal-backdrop">
          <section
            className="panel admin-confirm"
            role="dialog"
            aria-modal="true"
            aria-label="Xác nhận điều hành"
          >
            <ShieldCheck size={30} />
            <h2>{confirm.title}</h2>
            <p>{confirm.text}</p>
            <div className="admin-button-row">
              <button
                className="button secondary"
                disabled={working}
                onClick={() => setConfirm(null)}
              >
                Hủy
              </button>
              <button
                className="button primary"
                disabled={working}
                onClick={() => void confirm.run()}
              >
                {working ? 'Đang thực hiện' : 'Xác nhận thay đổi'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
