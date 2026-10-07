import { useEffect, useRef, useState } from 'react';
import {
  Store,
  RefreshCw,
  Search,
  Package,
  LockKeyhole,
  Coins,
  ScrollText,
  ArrowLeftRight,
  LogIn,
  X,
} from 'lucide-react';
import type { GameState } from './game/types';
import type { useCloud } from './cloud/useCloud';
import { api, type CloudSave } from './cloud/client';
import {
  MARKET_CURRENCY,
  marketName,
  type MarketFeed,
  type MarketListing,
  type MarketCurrency,
} from './game/market';
import './adventure.css';
const fmt = (n: number) => n.toLocaleString('vi-VN');
function operationId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 15) | 64;
  b[8] = (b[8] & 63) | 128;
  const hex = [...b].map((n) => n.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function MarketPanel({
  state: s,
  cloud,
  onLogin,
}: {
  state: GameState;
  cloud: ReturnType<typeof useCloud>;
  onLogin: () => void;
}) {
  const [tab, setTab] = useState('all'),
    [page, setPage] = useState(1),
    [feed, setFeed] = useState<MarketFeed | null>(null),
    [refresh, setRefresh] = useState(0),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [working, setWorking] = useState(false),
    [search, setSearch] = useState(''),
    [kind, setKind] = useState('all'),
    [sort, setSort] = useState('new'),
    [choice, setChoice] = useState('item:herb'),
    [quantity, setQuantity] = useState('1'),
    [price, setPrice] = useState('20'),
    [currency, setCurrency] = useState<MarketCurrency>('spirit'),
    [recipient, setRecipient] = useState(''),
    [confirm, setConfirm] = useState<{ listing: MarketListing; mode: 'buy' | 'cancel' } | null>(
      null,
    );
  const scope = `${cloud.account?.server}:${cloud.account?.token}`,
    current = useRef({ cloud, scope }),
    busy = useRef(false),
    requestId = useRef('');
  current.current = { cloud, scope };
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!confirm) return;
    const prior = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>('.button.secondary')?.focus();
    return () => {
      if (prior?.isConnected) prior.focus();
    };
  }, [confirm]);
  const disabled = working || cloud.working || !!cloud.conflict || !!s.battle || s.training.active;
  useEffect(() => {
    setFeed(null);
    setError('');
    setNotice('');
    setConfirm(null);
    setWorking(false);
    busy.current = false;
    requestId.current = '';
    setPage(1);
  }, [scope]);
  useEffect(() => {
    let live = true;
    const a = cloud.account;
    if (!a || tab === 'sell') return;
    const load = async () => {
      if (document.hidden) return;
      setLoading(true);
      try {
        const r = await api<MarketFeed>(a.server, `/market?tab=${tab}&page=${page}`, a.token);
        if (live) {
          setFeed(r);
          setError('');
        }
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : 'Chợ chưa kết nối được.');
      } finally {
        if (live) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(() => void load(), 15000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [scope, tab, page, refresh]);
  const choices = [
    ...Object.entries(s.inventory)
      .filter(([, n]) => !!n)
      .map(([id, n]) => ({
        id: `item:${id}`,
        name: marketName({ kind: 'item', id: id as keyof typeof s.inventory }),
        amount: n!,
      })),
    ...s.bag.map((g) => ({
      id: `gear:${g.uid}`,
      name: marketName({ kind: 'gear', gear: g }),
      amount: 1,
    })),
    ...Object.entries(s.adventure.materials)
      .filter(([, n]) => n > 0)
      .map(([id, n]) => ({
        id: `material:${id}`,
        name: marketName({ kind: 'material', id }),
        amount: n,
      })),
    ...Object.entries(s.adventure.talismans)
      .filter(([, n]) => n > 0)
      .map(([id, n]) => ({
        id: `talisman:${id}`,
        name: marketName({ kind: 'talisman', id }),
        amount: n,
      })),
  ];
  const amount = choices.find((x) => x.id === choice)?.amount || 0,
    units = choice.startsWith('gear:') ? 1 : Number(quantity),
    total = Number(price) * units,
    fee = Math.floor(total * 0.02);
  const action = async (path: string, body: Record<string, unknown>, message: string) => {
    if (busy.current) return;
    busy.current = true;
    setWorking(true);
    setError('');
    setNotice('');
    const sent = scope;
    try {
      await current.current.cloud.serverAction<{ cloud: CloudSave; listing: MarketListing }>(
        path,
        body,
      );
      if (current.current.scope === sent) {
        setNotice(message);
        setConfirm(null);
        setRefresh((n) => n + 1);
        if (path === '/market/list') requestId.current = '';
      }
    } catch (e) {
      if (current.current.scope === sent) {
        setError(e instanceof Error ? e.message : 'Giao dịch chưa hoàn tất.');
        setRefresh((n) => n + 1);
      }
    } finally {
      if (current.current.scope === sent) {
        busy.current = false;
        setWorking(false);
      }
    }
  };
  const draftChanged = () => {
    requestId.current = '';
    setNotice('');
  };
  const list = () => {
    if (disabled) return;
    const [assetKind, asset] = choice.split(':');
    requestId.current ||= operationId();
    void action(
      '/market/list',
      {
        requestId: requestId.current,
        kind: assetKind,
        asset,
        quantity: units,
        price: Number(price),
        currency,
        recipient,
      },
      'Đã ký gửi. Đồ được giữ trong đơn cho đến khi bán hoặc thu hồi.',
    );
  };
  let listings =
    feed?.listings.filter(
      (l) =>
        (kind === 'all' || l.asset.kind === kind) &&
        marketName(l.asset).toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi')),
    ) || [];
  if (sort === 'price')
    listings = [...listings].sort(
      (a, b) => a.currency.localeCompare(b.currency) || a.price * a.quantity - b.price * b.quantity,
    );
  return (
    <div className="dao-page market-page">
      <section className="panel dao-hero market-hero">
        <div>
          <span className="eyebrow">VẠN BẢO CÁC · ĐẠO HỮU TƯƠNG PHÙNG</span>
          <h2>
            Một món bảo vật.
            <br />
            Một người hữu duyên.
          </h2>
          <p>
            Ký gửi trang bị, vật phẩm, linh dược và phù lục. Mua bán bằng linh, tiên hoặc thần
            thạch; gửi đơn riêng cho bằng hữu.
          </p>
        </div>
        <div className="dao-emblem" aria-hidden="true">
          <Store size={66} />
          <i>万宝</i>
          <Coins size={30} />
        </div>
      </section>
      <div className="dao-summary">
        <article>
          <span>Linh thạch</span>
          <strong>{fmt(s.stones)}</strong>
        </article>
        <article>
          <span>Tiên thạch</span>
          <strong>{fmt(s.wallet.immortal)}</strong>
        </article>
        <article>
          <span>Thần thạch</span>
          <strong>{fmt(s.wallet.divine)}</strong>
        </article>
        <article>
          <span>Giao dịch hoàn tất</span>
          <strong>{s.adventure.marketTrades}</strong>
        </article>
      </div>
      {!cloud.account ? (
        <section className="panel dao-empty">
          <Store size={40} />
          <h3>Chợ của những người chơi thật</h3>
          <p>
            Đăng nhập cùng máy chủ với đạo hữu để mua bán. Động Thiên vẫn chơi được ngoại tuyến.
          </p>
          <button className="button primary" onClick={onLogin}>
            <LogIn size={17} />
            Đăng nhập & đồng bộ
          </button>
        </section>
      ) : (
        <>
          {disabled && !working && (
            <p className="dao-warning">
              {cloud.conflict
                ? 'Có bản lưu mới trên tài khoản. Mở đồng bộ và chọn bản trên tài khoản để nhận kết quả giao dịch.'
                : s.training.active || s.battle
                  ? 'Xuất định và kết thúc chiến đấu trước khi giao dịch.'
                  : 'Đang đồng bộ, vui lòng đợi.'}
              {cloud.conflict && (
                <button className="text-button" onClick={onLogin}>
                  Mở đồng bộ
                </button>
              )}
            </p>
          )}
          <nav className="dao-tabs" aria-label="Vạn Bảo Các">
            {[
              ['all', 'Chợ đạo hữu', Store],
              ['sell', 'Ký gửi', Package],
              ['mine', 'Đơn của tôi', ScrollText],
              ['inbox', 'Đơn riêng', LockKeyhole],
              ['history', 'Lịch sử', ArrowLeftRight],
            ].map(([id, label, Icon]) => {
              const I = Icon as typeof Store;
              return (
                <button
                  key={String(id)}
                  className={tab === id ? 'active' : ''}
                  aria-pressed={tab === id}
                  onClick={() => {
                    setTab(String(id));
                    setPage(1);
                    setFeed(null);
                  }}
                >
                  <I size={17} />
                  {String(label)}
                </button>
              );
            })}
          </nav>
          {notice && (
            <p role="status" className="dao-success">
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="dao-warning">
              {error}
            </p>
          )}
          {tab === 'sell' ? (
            <section className="panel market-form">
              <h3>Ký gửi bảo vật</h3>
              <p>
                Đồ rời ba lô và nằm trong đơn. Đơn mở 7 ngày; đơn hết hạn có thể thu hồi ở “Đơn của
                tôi”. Tối đa 20 đơn. Phí bán 2%, làm tròn xuống.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  list();
                }}
              >
                <label>
                  Bảo vật từ ba lô
                  <select
                    value={choices.some((x) => x.id === choice) ? choice : ''}
                    required
                    onChange={(e) => {
                      setChoice(e.target.value);
                      setQuantity('1');
                      draftChanged();
                    }}
                  >
                    <option value="">Chọn vật phẩm</option>
                    {choices.map((x) => (
                      <option value={x.id} key={x.id}>
                        {x.name} · có {x.amount}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="market-fields">
                  <label>
                    Số lượng
                    <input
                      type="number"
                      min="1"
                      max={Math.min(amount, 100000)}
                      value={choice.startsWith('gear:') ? '1' : quantity}
                      disabled={choice.startsWith('gear:')}
                      required
                      onChange={(e) => {
                        setQuantity(e.target.value);
                        draftChanged();
                      }}
                    />
                  </label>
                  <label>
                    Giá mỗi món
                    <input
                      type="number"
                      min="1"
                      max="1000000000"
                      value={price}
                      required
                      onChange={(e) => {
                        setPrice(e.target.value);
                        draftChanged();
                      }}
                    />
                  </label>
                  <label>
                    Loại thạch
                    <select
                      value={currency}
                      onChange={(e) => {
                        setCurrency(e.target.value as MarketCurrency);
                        draftChanged();
                      }}
                    >
                      {Object.entries(MARKET_CURRENCY).map(([id, label]) => (
                        <option
                          value={id}
                          key={id}
                          disabled={
                            (id === 'immortal' && s.stage < 36) || (id === 'divine' && s.stage < 64)
                          }
                        >
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  Người nhận riêng (không bắt buộc)
                  <input
                    value={recipient}
                    maxLength={24}
                    placeholder="Tên tài khoản đăng nhập của bằng hữu"
                    onChange={(e) => {
                      setRecipient(e.target.value);
                      draftChanged();
                    }}
                    autoCapitalize="none"
                  />
                </label>
                <div className="market-quote">
                  <span>
                    Tổng giá
                    <strong>
                      {Number.isSafeInteger(total) && total > 0 ? fmt(total) : '—'}{' '}
                      {MARKET_CURRENCY[currency]}
                    </strong>
                  </span>
                  <span>
                    Bạn nhận sau phí
                    <strong>
                      {Number.isSafeInteger(total) && total > 0 ? fmt(total - fee) : '—'}{' '}
                      {MARKET_CURRENCY[currency]}
                    </strong>
                  </span>
                </div>
                <button
                  className="button primary"
                  disabled={
                    disabled ||
                    !amount ||
                    units < 1 ||
                    units > amount ||
                    !Number.isSafeInteger(total) ||
                    total > 1e9 ||
                    total < 1
                  }
                >
                  {working
                    ? 'Đang ký gửi…'
                    : recipient.trim()
                      ? 'Gửi đơn riêng'
                      : 'Đăng bán tại chợ'}
                </button>
              </form>
            </section>
          ) : (
            <>
              <div className="market-toolbar">
                <label>
                  <Search size={17} />
                  <input
                    aria-label="Tìm bảo vật"
                    placeholder="Tên bảo vật…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <select
                  aria-label="Loại bảo vật"
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                >
                  <option value="all">Mọi bảo vật</option>
                  <option value="gear">Trang bị</option>
                  <option value="item">Vật phẩm</option>
                  <option value="material">Linh dược / nguyên liệu</option>
                  <option value="talisman">Phù lục</option>
                </select>
                <select
                  aria-label="Sắp xếp đơn"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="new">Mới nhất</option>
                  <option value="price">Giá tăng theo loại thạch</option>
                </select>
                <button
                  className="button secondary"
                  aria-label="Làm mới chợ"
                  onClick={() => setRefresh((n) => n + 1)}
                  disabled={loading}
                >
                  <RefreshCw size={17} />
                </button>
              </div>
              <small className="market-filter-note">
                Tìm kiếm và sắp xếp trên trang hiện tại · {feed?.total || 0} đơn
              </small>
              {!listings.length ? (
                <section className="panel dao-empty">
                  <Package size={34} />
                  <h3>{loading ? 'Đang mở Vạn Bảo Các…' : 'Chưa có bảo vật phù hợp'}</h3>
                  <p>
                    {tab === 'inbox'
                      ? 'Đơn dành riêng cho tài khoản của bạn sẽ xuất hiện ở đây.'
                      : tab === 'mine'
                        ? 'Những món đã ký gửi được giữ ở đây đến khi bán hoặc thu hồi.'
                        : 'Hãy là người mở phiên chợ đầu tiên, hoặc thử bộ lọc khác.'}
                  </p>
                </section>
              ) : (
                <div className="dao-grid">
                  {listings.map((l) => (
                    <article
                      className={`panel dao-card market-card ${l.self ? 'selected' : ''}`}
                      key={l.id}
                    >
                      <div className="dao-card-top">
                        <span className="dao-seal">
                          {l.asset.kind === 'gear'
                            ? '器'
                            : l.asset.kind === 'talisman'
                              ? '符'
                              : l.asset.kind === 'material'
                                ? '药'
                                : '宝'}
                        </span>
                        <span className="dao-pill">
                          {l.private ? 'Đơn riêng' : l.self ? 'Của bạn' : 'Ký gửi'}
                        </span>
                      </div>
                      <h3>{marketName(l.asset)}</h3>
                      <p>Người bán: {l.sellerName}</p>
                      <strong className="market-price">
                        {fmt(l.price * l.quantity)} <small>{MARKET_CURRENCY[l.currency]}</small>
                      </strong>
                      <small>
                        {l.quantity} món · {fmt(l.price)} mỗi món · phí bán {fmt(l.fee)}
                      </small>
                      <small>
                        {l.status === 'sold'
                          ? `Đã bán cho ${l.buyerName}`
                          : l.status === 'cancelled'
                            ? 'Đã thu hồi'
                            : l.expiresAt <= Date.now()
                              ? 'Hết hạn · thu hồi để nhận lại đồ'
                              : `Hết hạn ${new Date(l.expiresAt).toLocaleString('vi-VN')}`}
                      </small>
                      {l.self && l.status === 'open' ? (
                        <button
                          className="button secondary"
                          disabled={disabled}
                          onClick={() => setConfirm({ listing: l, mode: 'cancel' })}
                        >
                          Thu hồi bảo vật
                        </button>
                      ) : l.canBuy ? (
                        <button
                          className="button primary"
                          disabled={disabled}
                          onClick={() => setConfirm({ listing: l, mode: 'buy' })}
                        >
                          Mua bảo vật
                        </button>
                      ) : (
                        <span className="dao-bonus">
                          {l.status === 'sold'
                            ? 'Giao dịch hoàn tất'
                            : l.status === 'cancelled'
                              ? 'Đã hoàn trả'
                              : 'Đơn không khả dụng'}
                        </span>
                      )}
                    </article>
                  ))}
                </div>
              )}
              <div className="market-pagination">
                <button
                  className="button secondary"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((n) => n - 1)}
                >
                  Trang trước
                </button>
                <span>
                  Trang {page} / {Math.max(1, Math.ceil((feed?.total || 0) / 30))}
                </span>
                <button
                  className="button secondary"
                  disabled={page * 30 >= (feed?.total || 0) || loading}
                  onClick={() => setPage((n) => n + 1)}
                >
                  Trang sau
                </button>
              </div>
            </>
          )}
        </>
      )}
      {confirm && (
        <div
          className="dao-modal-backdrop"
          onKeyDown={(e) => {
            if (e.key === 'Escape' && !working) setConfirm(null);
            if (e.key === 'Tab') {
              const buttons = [
                ...(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ||
                  []),
              ];
              const first = buttons[0],
                last = buttons.at(-1);
              if (!first) e.preventDefault();
              else if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
              }
            }
          }}
        >
          <section
            ref={dialog}
            className="panel dao-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="market-confirm-title"
          >
            <button
              className="dao-close"
              aria-label="Đóng xác nhận"
              disabled={working}
              onClick={() => setConfirm(null)}
            >
              <X size={22} />
            </button>
            <span className="eyebrow">VẠN BẢO CÁC · XÁC NHẬN</span>
            <h3 id="market-confirm-title">
              {confirm.mode === 'buy' ? 'Nhận bảo vật hữu duyên?' : 'Thu hồi đồ ký gửi?'}
            </h3>
            <p>
              {marketName(confirm.listing.asset)} · {confirm.listing.quantity} món
            </p>
            <strong className="market-price">
              {confirm.mode === 'buy'
                ? `${fmt(confirm.listing.price * confirm.listing.quantity)} ${MARKET_CURRENCY[confirm.listing.currency]}`
                : 'Đồ trở về ba lô, không mất phí.'}
            </strong>
            <p>
              Giao dịch cập nhật bản lưu tài khoản. Nếu thiết bị khác đang có tiến trình mới, hãy
              đồng bộ và chọn bản lưu trước.
            </p>
            <div className="dao-card-actions">
              <button
                autoFocus
                className="button secondary"
                disabled={working}
                onClick={() => setConfirm(null)}
              >
                Quay lại
              </button>
              <button
                className="button primary"
                disabled={disabled}
                onClick={() =>
                  void action(
                    `/market/${confirm.listing.id}/${confirm.mode}`,
                    {},
                    confirm.mode === 'buy'
                      ? 'Đã mua bảo vật. Đồ đã lưu trong tài khoản.'
                      : 'Đã thu hồi. Đồ đã trở về tài khoản.',
                  )
                }
              >
                {working
                  ? 'Đang giao dịch…'
                  : confirm.mode === 'buy'
                    ? 'Xác nhận mua'
                    : 'Xác nhận thu hồi'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
