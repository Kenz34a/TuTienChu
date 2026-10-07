import { useEffect, useRef, useState } from 'react';
import { Gift, LogIn, ScrollText, Sparkles } from 'lucide-react';
import type { useCloud } from './cloud/useCloud';
import { api, type CloudSave } from './cloud/client';
import { rewardText, type GiftReceipt } from './game/gifts';
import './admin.css';

export function GiftPanel({
  cloud,
  onLogin,
}: {
  cloud: ReturnType<typeof useCloud>;
  onLogin: () => void;
}) {
  const [code, setCode] = useState(''),
    [receipts, setReceipts] = useState<GiftReceipt[]>([]),
    [working, setWorking] = useState(false),
    [notice, setNotice] = useState(''),
    [error, setError] = useState(''),
    [refresh, setRefresh] = useState(0);
  const scope = `${cloud.account?.server}:${cloud.account?.token}`;
  const current = useRef({ cloud, scope });
  current.current = { cloud, scope };
  useEffect(() => {
    let live = true;
    setReceipts([]);
    const a = cloud.account;
    if (a)
      void api<{ receipts: GiftReceipt[] }>(a.server, '/giftcodes/history', a.token)
        .then((r) => {
          if (live) setReceipts(r.receipts);
        })
        .catch((e) => {
          if (live) setError(e.message);
        });
    return () => {
      live = false;
    };
  }, [scope, refresh]);
  useEffect(() => {
    setNotice('');
    setError('');
  }, [scope]);
  const redeem = async () => {
    if (working || !code.trim()) return;
    setWorking(true);
    setError('');
    setNotice('');
    const sent = scope;
    try {
      const r = await current.current.cloud.serverAction<{
        cloud: CloudSave;
        receipt: GiftReceipt;
      }>('/giftcodes/redeem', { code });
      if (current.current.scope !== sent) return;
      setCode('');
      setRefresh((k) => k + 1);
      setNotice(`Đã nhận ${r.receipt.code}: ${rewardText(r.receipt.reward)}.`);
    } catch (e) {
      if (current.current.scope === sent)
        setError(e instanceof Error ? e.message : 'Chưa nhận được quà.');
    } finally {
      setWorking(false);
    }
  };
  return (
    <div className="gift-page">
      <section className="panel gift-hero">
        <div className="gift-seal">
          <Gift size={44} />
          <span>礼</span>
        </div>
        <div>
          <span className="eyebrow">CƠ DUYÊN TỪ THIÊN ĐẠO</span>
          <h2>Một món quà, thêm bước tiên lộ.</h2>
          <p>
            Nhập giftcode do admin máy chủ phát hành. Quà lưu vào tài khoản và dùng chung trên web,
            PC, Android.
          </p>
        </div>
      </section>
      <section className="panel gift-form-panel">
        <h3>Nhập giftcode</h3>
        <p>
          Mỗi tài khoản nhận một mã một lần. Mã có thể yêu cầu tu vi, thời hạn hoặc còn lượt nhận.
        </p>
        {!cloud.account ? (
          <button className="button primary" onClick={onLogin}>
            <LogIn size={17} />
            Đăng nhập để nhận quà
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void redeem();
            }}
          >
            <label htmlFor="gift-code">Mã quà tặng</label>
            <div className="gift-code-input">
              <input
                id="gift-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={40}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                placeholder="Nhập mã từ admin"
                required
              />
              <button
                className="button primary"
                disabled={working || cloud.working || !!cloud.conflict || !code.trim()}
              >
                <Sparkles size={16} />
                {working ? 'Đang nhận quà' : 'Nhận quà'}
              </button>
            </div>
          </form>
        )}
        {notice && (
          <p className="admin-success" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
        {cloud.conflict && (
          <div className="admin-error">
            <p>
              Có hai bản tiến trình. Nếu vừa nhận quà, chọn bản trên tài khoản để dùng phần thưởng
              đã lưu trên máy chủ.
            </p>
            <button className="button secondary" onClick={onLogin}>
              Mở Tài khoản & đồng bộ
            </button>
          </div>
        )}
      </section>
      <section className="panel gift-history">
        <h3>
          <ScrollText size={19} />
          Quà đã nhận
        </h3>
        {receipts.length ? (
          receipts.map((r) => (
            <article key={r.code}>
              <Gift size={22} />
              <div>
                <strong>{r.label}</strong>
                <code>{r.code}</code>
                <p>{rewardText(r.reward)}</p>
                <small>{new Date(r.time).toLocaleString('vi-VN')}</small>
              </div>
            </article>
          ))
        ) : (
          <p>
            {cloud.account
              ? 'Chưa nhận giftcode nào trên tài khoản này.'
              : 'Đăng nhập để xem lịch sử nhận quà.'}
          </p>
        )}
      </section>
    </div>
  );
}
