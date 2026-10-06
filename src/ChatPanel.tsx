import { useEffect, useRef, useState } from 'react';
import { LogIn, MessageCircle, Send, WifiOff } from 'lucide-react';
import { api } from './cloud/client';
import type { useCloud } from './cloud/useCloud';
import type { GameState } from './game/types';
import { realmName } from './game/data';
import { TITLES } from './game/titles';
import { TitleBadge } from './TitlePanel';
import './chat.css';

interface ChatMessage {
  id: number;
  name: string;
  stage: number;
  titleId: string | null;
  world: string;
  body: string;
  time: number;
  self: boolean;
}
interface ChatResponse {
  messages: ChatMessage[];
  serverTime: number;
  nextSendAt: number;
}
const channels = [
  { id: 'all', name: 'Tam giới', minStage: 0 },
  { id: 'earth', name: 'Địa giới', minStage: 0 },
  { id: 'immortal', name: 'Tiên giới', minStage: 27 },
  { id: 'divine', name: 'Thần giới', minStage: 48 },
];

export function ChatPanel({
  state,
  cloud,
  onLogin,
}: {
  state: GameState;
  cloud: ReturnType<typeof useCloud>;
  onLogin: () => void;
}) {
  const [world, setWorld] = useState('all');
  const [data, setData] = useState<ChatResponse | null>(null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [offset, setOffset] = useState(0);
  const scope = `${cloud.account?.server || cloud.server}:${cloud.account?.token || ''}:${world}`;
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const currentCloud = useRef(cloud);
  currentCloud.current = cloud;
  const requestId = useRef(0),
    scroller = useRef<HTMLDivElement>(null);
  const [refreshKey, refresh] = useState(0);
  useEffect(() => {
    let live = true,
      fetching = false;
    setData(null);
    setError('');
    const poll = async () => {
      if (fetching) return;
      fetching = true;
      const c = currentCloud.current;
      try {
        const response = await api<ChatResponse>(
          c.account?.server || c.server,
          `/chat?world=${world}`,
          c.account?.token,
        );
        if (live && currentScope.current === scope) {
          setData(response);
          setOffset(response.serverTime - Date.now());
          setError('');
        }
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : 'Không kết nối được chat thế giới.');
      } finally {
        fetching = false;
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 5000);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [scope, world, refreshKey]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [data?.messages.at(-1)?.id, world]);
  const remaining = Math.max(0, Math.ceil(((data?.nextSendAt || 0) - (now + offset)) / 1000));
  const permitted = state.stage >= channels.find((c) => c.id === world)!.minStage;
  const count = [...draft].length;
  const send = async () => {
    const c = currentCloud.current,
      a = c.account,
      epoch = ++requestId.current;
    if (!a || sending || !permitted || remaining || !draft.trim() || count > 200) return;
    const sentScope = currentScope.current,
      text = draft;
    setSending(true);
    setError('');
    try {
      await c.sync();
      await api(a.server, '/chat', a.token, { world, body: text }, 'POST');
      if (currentScope.current === sentScope) {
        setDraft('');
        refresh((k) => k + 1);
      }
    } catch (e) {
      if (currentScope.current === sentScope)
        setError(e instanceof Error ? e.message : 'Chưa gửi được tin. Nội dung vẫn được giữ.');
    } finally {
      if (requestId.current === epoch) setSending(false);
    }
  };
  return (
    <section className="panel world-chat">
      <div className="chat-heading">
        <MessageCircle size={28} />
        <div>
          <h2>Đạo hữu khắp tam giới</h2>
          <p>Tin nhắn từ nhân vật thật, đồng bộ giữa web và app.</p>
        </div>
        <span className={`chat-connection ${data && !error ? 'connected' : ''}`}>
          {data && !error ? 'Đã kết nối' : 'Chờ máy chủ'}
        </span>
      </div>
      <div className="chat-channels" aria-label="Kênh chat">
        {channels.map((c) => (
          <button
            key={c.id}
            aria-pressed={world === c.id}
            className={world === c.id ? 'active' : ''}
            onClick={() => setWorld(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>
      {error && (
        <div className="chat-error" role="alert">
          <WifiOff size={17} />
          <span>{error} Tin chưa gửi vẫn được giữ trong ô soạn.</span>
          <button className="text-button" onClick={() => refresh((k) => k + 1)}>
            Thử lại
          </button>
        </div>
      )}
      <div
        className="chat-messages"
        ref={scroller}
        role="log"
        aria-label="Tin nhắn thế giới"
        aria-live="polite"
        aria-relevant="additions"
      >
        {data?.messages.length ? (
          data.messages.map((m) => (
            <article
              className={`chat-message ${m.self ? 'self' : ''}`}
              key={m.id}
              aria-label={`Tin từ ${m.name}`}
            >
              <span className="chat-avatar" aria-hidden="true">
                {[...m.name][0]}
              </span>
              <div className="chat-bubble">
                <div className="chat-author">
                  <strong>{m.name}</strong>
                  {m.self && <small>Bạn</small>}
                  <time dateTime={new Date(m.time).toISOString()}>
                    {new Date(m.time).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Asia/Ho_Chi_Minh',
                    })}
                  </time>
                </div>
                <span className="chat-realm">{realmName(m.stage)}</span>
                <TitleBadge
                  title={TITLES.find((t) => t.id === m.titleId)}
                  compact
                  animated={state.titles.effects}
                />
                <p>{m.body}</p>
              </div>
            </article>
          ))
        ) : (
          <div className="chat-empty">
            <MessageCircle size={40} />
            <h3>{data ? 'Chưa có lời truyền âm' : 'Kết nối để hội ngộ đạo hữu'}</h3>
            <p>
              {data
                ? 'Hãy bắt đầu câu chuyện ở kênh này.'
                : 'Mở Tài khoản & đồng bộ, chọn cùng địa chỉ máy chủ trên web và app.'}
            </p>
          </div>
        )}
      </div>
      {!cloud.account ? (
        <div className="chat-login">
          <p>Đăng nhập và đồng bộ nhân vật để gửi tin.</p>
          <button className="button primary" onClick={onLogin}>
            <LogIn size={16} />
            Đăng nhập để chat
          </button>
        </div>
      ) : (
        <form
          className="chat-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label htmlFor="world-chat-draft">
            {permitted ? 'Truyền âm đến đạo hữu' : 'Chưa đủ tu vi để gửi ở giới này'}
          </label>
          <div>
            <textarea
              id="world-chat-draft"
              rows={2}
              value={draft}
              disabled={!permitted || sending}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Gửi lời chào, tìm đồng môn, bàn luận tiên đạo…"
            />
            <button
              className="button primary"
              disabled={
                !data || sending || !permitted || !!remaining || !draft.trim() || count > 200
              }
              type="submit"
            >
              <Send size={16} />
              {sending ? 'Đang gửi' : remaining ? `Đợi ${remaining}s` : 'Gửi tin nhắn'}
            </button>
          </div>
          <small>{count}/200 ký tự · Mỗi tin cách nhau 3 giây</small>
        </form>
      )}
      <p className="chat-retention">
        Hiển thị 100 tin gần nhất mỗi kênh; máy chủ giữ tối đa 2.000 tin trong 3 ngày. Kênh
        Tiên/Thần giới yêu cầu tu vi tương ứng để gửi.
      </p>
    </section>
  );
}
