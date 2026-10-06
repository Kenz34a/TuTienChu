import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  Backpack,
  Bell,
  Bird,
  BookOpen,
  Castle,
  Check,
  ChevronRight,
  CircleCheck,
  CircleHelp,
  Clock3,
  Coins,
  Crown,
  Compass,
  Download,
  Eye,
  Flame,
  FlaskConical,
  Footprints,
  Gem,
  Hammer,
  Heart,
  LayoutDashboard,
  Leaf,
  LockKeyhole,
  Map,
  Menu,
  MessageCircle,
  MonitorSmartphone,
  Mountain,
  Moon,
  Trophy,
  Skull,
  Plus,
  ScrollText,
  Search,
  Settings2,
  Shield,
  Sparkles,
  Sun,
  Swords,
  Trash2,
  Upload,
  UserRound,
  WifiOff,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import { Landscape } from './Landscape';
import { Bestiary, SecretPanel } from './EncounterPanels';
import { KIND_LABELS, SECRET_AREAS } from './game/encounters';
import { useGame } from './useGame';
import { useCloud } from './cloud/useCloud';
import { useCommunity } from './cloud/useCommunity';
import { useNotifications } from './useNotifications';
import { useTheme } from './useTheme';
import { CurrencyPanel, LineagePanel } from './LineagePanel';
import { TitleBadge, TitlePanel } from './TitlePanel';
import { ChatPanel } from './ChatPanel';
import { CultivationGuide } from './CultivationGuide';
import './cultivation.css';
import { equippedTitle } from './game/titles';
import { BREAKTHROUGH_PATHS, breakthroughRequirements } from './game/progression';
import { currentRealmMethod } from './game/realmMethods';
import './expansion.css';
import {
  CommunityPanel,
  CultivatorArt,
  CustomSectPanel,
  DungeonsPanel,
  ManualsPanel,
} from './ExpansionPanels';
import { qiCost, breakthroughTier, tierLabel } from './game/expansion';
import { AccountPanel } from './cloud/AccountPanel';
import { nativeApp, desktopApp, androidApp } from './cloud/client';
import {
  ITEMS,
  MAPS,
  NPCS,
  QUESTS,
  RACES,
  RANKS,
  REALMS,
  SECTS,
  SLOTS,
  STAGES,
  WORLDS,
  questClaimed,
  realmName,
  sectRank,
  sectInfo,
  stoneCost,
  xpNeeded,
  type MapData,
  type Quest,
} from './game/data';
import { bagUsed, gearPower, stats } from './game/engine';
import { SAVE_KEY } from './game/storage';
import type { BreakthroughMethod, GameState, Gear, ItemId, RaceId, World } from './game/types';

type View =
  | 'dashboard'
  | 'world'
  | 'bag'
  | 'quests'
  | 'sect'
  | 'craft'
  | 'character'
  | 'manuals'
  | 'dungeons'
  | 'community'
  | 'lineage'
  | 'titles'
  | 'chat'
  | 'cultivation';
type Dialog =
  | 'settings'
  | 'help'
  | 'shop'
  | 'realms'
  | 'install'
  | 'events'
  | 'account'
  | 'notifications'
  | null;
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
const navigation = [
  {
    id: 'dashboard' as View,
    label: 'Đạo lộ',
    icon: LayoutDashboard,
    subtitle: 'Hành trình của bạn',
  },
  { id: 'world' as View, label: 'Khám phá', icon: Map, subtitle: 'Bước qua tam giới' },
  { id: 'bag' as View, label: 'Ba lô', icon: Backpack, subtitle: 'Hành trang tiên lộ' },
  {
    id: 'quests' as View,
    label: 'Nhiệm vụ',
    icon: ScrollText,
    subtitle: 'Mỗi cơ duyên, một câu chuyện',
  },
  { id: 'sect' as View, label: 'Tông môn', icon: Castle, subtitle: 'Đồng môn cùng chung đạo tâm' },
  {
    id: 'craft' as View,
    label: 'Luyện chế',
    icon: FlaskConical,
    subtitle: 'Linh thảo hóa đan, huyền thiết hóa khí',
  },
  {
    id: 'character' as View,
    label: 'Nhân vật',
    icon: UserRound,
    subtitle: 'Hiểu mình để hiểu đạo',
  },
  {
    id: 'manuals' as View,
    label: 'Bí kíp',
    icon: BookOpen,
    subtitle: 'Tham ngộ đạo pháp trong tàng kinh các',
  },
  {
    id: 'lineage' as View,
    label: 'Linh căn & truyền thừa',
    icon: Sparkles,
    subtitle: 'Thức tỉnh thiên tư, kế thừa đạo thống',
  },
  {
    id: 'dungeons' as View,
    label: 'Phó bản',
    icon: Skull,
    subtitle: 'Vượt ba cửa, giữ vững đạo tâm',
  },
  {
    id: 'community' as View,
    label: 'Thiên bảng',
    icon: Trophy,
    subtitle: 'Xếp hạng, top online và boss thế giới',
  },
  {
    id: 'titles' as View,
    label: 'Danh hiệu',
    icon: Crown,
    subtitle: 'Phong hào lưu danh khắp tam giới',
  },
  {
    id: 'chat' as View,
    label: 'Chat thế giới',
    icon: MessageCircle,
    subtitle: 'Truyền âm cùng đạo hữu khắp tam giới',
  },
  {
    id: 'cultivation' as View,
    label: 'Tu luyện & đột phá',
    icon: BookOpen,
    subtitle: 'Pháp môn riêng cho từng cảnh giới',
  },
];
const fmt = (n: number) => Math.floor(n).toLocaleString('vi-VN');
const compact = (n: number) => (n > 99999 ? `${(n / 1000).toFixed(1)}k` : fmt(n));

function Progress({ value, color = '', label }: { value: number; color?: string; label?: string }) {
  return (
    <div
      className={`progress ${color}`}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.min(100, value))}
    >
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
function Tag({ children, color = '' }: { children: ReactNode; color?: string }) {
  return <span className={`tag ${color}`}>{children}</span>;
}
function SectionTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
function Empty({
  icon = <Wind size={34} />,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      {icon}
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose?: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`modal ${wide ? 'wide' : ''}`}
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose?.();
          if (e.key === 'Tab') {
            const focusable = ref.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled), input, select, textarea, a[href]',
            );
            if (!focusable?.length) {
              e.preventDefault();
              return;
            }
            const first = focusable[0],
              last = focusable[focusable.length - 1];
            if (
              e.shiftKey &&
              (document.activeElement === first || document.activeElement === ref.current)
            ) {
              e.preventDefault();
              last.focus();
            } else if (
              !e.shiftKey &&
              (document.activeElement === last || document.activeElement === ref.current)
            ) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <div className="modal-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {onClose && (
            <button className="icon-button" onClick={onClose} aria-label="Đóng">
              <X size={20} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
function GearTile({
  gear,
  onClick,
  selected,
}: {
  gear: Gear;
  onClick?: () => void;
  selected?: boolean;
}) {
  const slot = SLOTS.find((s) => s.id === gear.slot)!,
    rank = RANKS[gear.rank];
  const Tile = onClick ? 'button' : 'div';
  return (
    <Tile
      className={`gear-tile ${selected ? 'selected' : ''}`}
      style={{ '--rank': rank.color } as React.CSSProperties}
      onClick={onClick}
      role={onClick ? undefined : 'img'}
      aria-label={`${rank.prefix} ${slot.name}, ${rank.name}, cường hóa ${gear.level}`}
    >
      <span className="gear-symbol">{slot.symbol}</span>
      <span className="gear-grade-dot" />
      {gear.level > 0 && <small>+{gear.level}</small>}
    </Tile>
  );
}
function MapCard({
  map,
  state,
  onExplore,
  onBestiary,
}: {
  map: MapData;
  state: GameState;
  onExplore: () => void;
  onBestiary: () => void;
}) {
  const locked = state.stage < map.minStage;
  return (
    <article className={`map-card ${locked ? 'locked' : ''}`}>
      <div className="map-art">
        <Landscape terrain={map.terrain} night={map.world === 'divine'} />
        <span className={`map-pill ${locked ? 'is-locked' : ''}`}>
          {locked ? <LockKeyhole size={12} /> : <span className="status-dot" />}
          {locked ? 'Chưa khai mở' : map.difficulty}
        </span>
        {state.explored.includes(map.id) && (
          <span className="map-visited" title="Đã khám phá">
            <Check size={14} />
          </span>
        )}
      </div>
      <div className="map-card-content">
        <h3>{map.name}</h3>
        <p>{map.subtitle}</p>
        <div className="map-card-meta">
          <span>
            <Swords size={13} />
            {map.enemyTitle}
          </span>
          <span>
            <Zap size={13} />8 thể lực
          </span>
        </div>
        <button className="map-go" onClick={onExplore} disabled={locked}>
          {locked ? (
            <>
              <LockKeyhole size={13} />
              {realmName(map.minStage)}
            </>
          ) : (
            <>
              Khám phá
              <ArrowUpRight size={16} />
            </>
          )}
        </button>
        <button className="map-bestiary" onClick={onBestiary}>
          <Eye size={12} />5 quái thường · 3 tinh anh
          <ChevronRight size={12} />
        </button>
      </div>
    </article>
  );
}
function QuestRow({
  quest: q,
  state,
  onClaim,
  full = false,
}: {
  quest: Quest;
  state: GameState;
  onClaim: () => void;
  full?: boolean;
}) {
  const claimed = questClaimed(state, q),
    unlocked = state.stage >= q.minStage;
  const progress = Math.min(q.progress(state), q.target),
    ready = progress === q.target && unlocked && !claimed;
  return (
    <div className={`quest-row ${claimed ? 'claimed' : ''} ${full ? 'quest-full' : ''}`}>
      <div className={`quest-icon ${ready ? 'ready' : ''}`}>
        {claimed ? (
          <CircleCheck size={19} />
        ) : q.category === 'hidden' ? (
          <Eye size={19} />
        ) : (
          <ScrollText size={19} />
        )}
      </div>
      <div className="quest-row-body">
        <h4>
          {q.name}
          {q.category === 'daily' && <span className="tiny-label">Hằng ngày</span>}
        </h4>
        {full && <p>{q.description}</p>}
        <div className="quest-progress-line">
          <span>
            {claimed
              ? 'Đã hoàn thành'
              : !unlocked
                ? `Yêu cầu ${realmName(q.minStage)}`
                : `${progress}/${q.target} · ${ready ? 'Có thể nhận thưởng' : 'Đang thực hiện'}`}
          </span>
          {!claimed && (
            <span className="reward-preview">
              <Gem size={11} />
              {compact(q.stones)}
            </span>
          )}
        </div>
        {full && (
          <>
            <Progress value={(progress / q.target) * 100} label={`Tiến độ ${q.name}`} />
            <div className="quest-rewards">
              <span>
                <Gem size={13} />
                {fmt(q.stones)} linh thạch
              </span>
              <span>
                <Sparkles size={13} />
                {fmt(q.xp)} tu vi
              </span>
              {q.item && <span>+ {ITEMS[q.item].name}</span>}
            </div>
          </>
        )}
      </div>
      {ready ? (
        <button className="claim-button" onClick={onClaim}>
          Nhận{full && <Check size={14} />}
        </button>
      ) : claimed ? (
        <Check className="muted" size={18} />
      ) : (
        <span className="quest-fraction">{Math.round((progress / q.target) * 100)}%</span>
      )}
    </div>
  );
}

export default function App() {
  const game = useGame(),
    { state: s, act, notice, tell } = game;
  const cloud = useCloud(s, game.restoreCloud, game.storageBlocked);
  const community = useCommunity(cloud);
  const alerts = useNotifications(
    s,
    community.data,
    `${cloud.server}:${cloud.account?.username || 'guest'}`,
  );
  const appearance = useTheme();
  const [breakthroughMethod, setBreakthroughMethod] = useState<BreakthroughMethod>('meditation');
  const currentSect = sectInfo(s);
  const realmCoins = breakthroughTier(s.stage);
  const breakthrough = breakthroughRequirements(s, breakthroughMethod);
  const realmMethod = currentRealmMethod(s.stage);
  const honor = equippedTitle(s);
  const st = stats(s),
    needed = xpNeeded(s.stage),
    ready = breakthrough.ready;
  const [view, setView] = useState<View>('dashboard');
  const [world, setWorld] = useState<World>('earth');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [npcId, setNpcId] = useState<string | null>(null);
  const [bestiaryMap, setBestiaryMap] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [questTab, setQuestTab] = useState<'main' | 'daily' | 'hidden'>('main');
  const [bagTab, setBagTab] = useState<'all' | 'gear' | 'items'>('all');
  const [bagSearch, setBagSearch] = useState('');
  const [selectedGear, setSelectedGear] = useState<string | null>(null);
  const [name, setName] = useState(s.name);
  const [race, setRace] = useState<RaceId>(s.race);
  useEffect(() => {
    setName(s.name);
    setRace(s.race);
  }, [s.name, s.race]);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showTip, setShowTip] = useState(true);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(
    window.matchMedia('(display-mode: standalone)').matches,
  );
  const [online, setOnline] = useState(navigator.onLine);
  const importInput = useRef<HTMLInputElement>(null);
  const gearDetail = useRef<HTMLElement>(null);
  const page = navigation.find((n) => n.id === view)!;
  const raceInfo = RACES.find((r) => r.id === s.race)!;
  const availableQuests = QUESTS.filter(
    (q) => (!q.reveal || q.reveal(s)) && s.stage >= q.minStage && !questClaimed(s, q),
  );
  const claimCount = availableQuests.filter((q) => q.progress(s) >= q.target).length;
  const moveTo = (next: View) => {
    setView(next);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const explore = (mapId: string) => {
    act({ type: 'explore', mapId });
  };
  useEffect(() => {
    const onInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallEvent(null);
    };
    const onOnline = () => setOnline(true),
      onOffline = () => setOnline(false);
    const onPwaError = () =>
      tell('Chế độ ngoại tuyến chưa sẵn sàng. Hãy tải lại khi có mạng.', false);
    window.addEventListener('beforeinstallprompt', onInstall);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('pwa-error', onPwaError);
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstall);
      window.removeEventListener('appinstalled', onInstalled);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('pwa-error', onPwaError);
    };
  }, [tell]);
  const installApp = async () => {
    if (!installEvent) {
      setDialog('install');
      return;
    }
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      setInstallEvent(null);
      if (choice.outcome === 'accepted')
        tell('Đã chấp nhận cài ứng dụng. Trình duyệt sẽ hoàn tất việc cài đặt.');
    } catch {
      tell('Hãy dùng menu trình duyệt để cài ứng dụng.', false);
    }
  };
  const exportSave = async () => {
    let raw = JSON.stringify(s, null, 2);
    if (game.storageBlocked) {
      try {
        raw = localStorage.getItem(SAVE_KEY) || raw;
      } catch {
        tell('Trình duyệt đang chặn quyền đọc bản lưu cũ. Hãy bật lưu trữ cho trang này.', false);
        return;
      }
    }
    if (desktopApp && window.vanTienDesktop) {
      const result = await window.vanTienDesktop.exportSave(raw);
      if (result.error) tell(result.error, false);
      else if (result.saved) tell('Đã xuất bản lưu lên máy tính.');
      return;
    }
    if (androidApp) {
      try {
        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');
        const saved = await Filesystem.writeFile({
          path: `van-tien-ky-${new Date().toISOString().slice(0, 10)}.json`,
          data: raw,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({
          title: 'Bản lưu Vân Tiên Ký',
          files: [saved.uri],
          dialogTitle: 'Lưu hoặc chia sẻ đạo lộ',
        });
      } catch {
        tell('Chưa chia sẻ được bản lưu. Hãy thử xuất lại hoặc đồng bộ tài khoản.', false);
      }
      return;
    }
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `van-tien-ky-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    tell('Đã xuất bản lưu. Bạn có thể nhập tệp này trên thiết bị khác.');
  };
  const selected =
    s.bag.find((g) => g.uid === selectedGear) ||
    Object.values(s.equipped).find((g) => g?.uid === selectedGear);
  const isEquipped = selected && s.equipped[selected.slot]?.uid === selected.uid;
  useEffect(() => {
    if (selectedGear && view === 'bag') {
      gearDetail.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedGear, view]);

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Đóng menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button
          className="brand"
          onClick={() => moveTo('dashboard')}
          aria-label="Vân Tiên Ký — về đạo lộ"
        >
          <span className="brand-mark">
            <Mountain size={28} strokeWidth={1.3} />
            <span />
          </span>
          <span>
            <strong>Vân Tiên Ký</strong>
            <small>MỘT NIỆM THÀNH TIÊN</small>
          </span>
        </button>
        <div className="sidebar-divider" />
        <div className="nav-section-label">TIÊN LỘ CỦA BẠN</div>
        <nav aria-label="Điều hướng chính">
          {navigation.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${view === n.id ? 'active' : ''}`}
              onClick={() => moveTo(n.id)}
              aria-current={view === n.id ? 'page' : undefined}
            >
              <n.icon size={19} strokeWidth={1.6} />
              <span>{n.label}</span>
              {n.id === 'quests' && claimCount > 0 ? (
                <b className="nav-count">{claimCount}</b>
              ) : view === n.id ? (
                <span className="active-dot" />
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-poem">
            <Bird size={25} strokeWidth={1} />
            <p>
              “Tâm như nước tĩnh,
              <br />
              đạo tự khai hoa.”
            </p>
            <span>— Thanh Vân đạo thư</span>
          </div>
          <button className="install-side" onClick={() => setDialog('install')}>
            <MonitorSmartphone size={18} />
            <span>
              {installed ? 'Đã cài ứng dụng' : 'Mang tiên lộ bên mình'}
              <small>
                {installed ? 'Chơi mọi lúc, mọi nơi' : 'Cài ứng dụng · Chơi ngoại tuyến'}
              </small>
            </span>
            <ChevronRight size={14} />
          </button>
          <div className="sidebar-player">
            <button className="player-link" onClick={() => moveTo('character')}>
              <span className="avatar">{raceInfo.symbol}</span>
              <span>
                <strong>{s.name}</strong>
                <TitleBadge title={honor} animated={s.titles.effects} compact />
                <small>
                  {REALMS[Math.floor(s.stage / 3)]} · {STAGES[s.stage % 3]}
                </small>
              </span>
            </button>
            <button
              className="sidebar-settings"
              aria-label="Cài đặt"
              onClick={() => {
                setConfirmReset(false);
                setDialog('settings');
              }}
            >
              <Settings2 size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Mở menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb">
              Tiên lộ
              <ChevronRight size={13} />
              <strong>{page.label}</strong>
            </span>
          </div>
          <div className="topbar-actions">
            <button
              className="icon-button theme-toggle"
              aria-label={appearance.theme === 'dark' ? 'Bật giao diện sáng' : 'Bật giao diện tối'}
              onClick={appearance.toggle}
            >
              {appearance.theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              className={`cloud-header ${cloud.status}`}
              onClick={() => setDialog('account')}
              aria-label="Tài khoản & đồng bộ"
            >
              <MonitorSmartphone size={16} />
              <span>{cloud.account ? cloud.label : 'Đăng nhập'}</span>
            </button>
            <span className="season">
              <Sun size={15} />
              Tiết Thanh Minh
            </span>
            <span className="topbar-separator" />
            <button
              className="currency-button"
              onClick={() => setDialog('shop')}
              aria-label={`Cửa hàng, ${fmt(s.stones)} linh thạch`}
            >
              <Gem size={17} />
              <strong>{fmt(s.stones)}</strong>
              <Plus size={13} />
            </button>
            <button
              className="icon-button notification"
              aria-label="Thông báo"
              onClick={() => setDialog('notifications')}
            >
              <Bell size={19} />
              {alerts.unread > 0 && (
                <b className="notification-count">{alerts.unread > 9 ? '9+' : alerts.unread}</b>
              )}
            </button>
            <button
              className="header-avatar"
              onClick={() => moveTo('character')}
              aria-label="Nhân vật"
            >
              {raceInfo.symbol}
            </button>
          </div>
        </header>
        <main>
          {(cloud.status === 'conflict' || cloud.status === 'expired') && (
            <button className="cloud-alert" onClick={() => setDialog('account')}>
              <MonitorSmartphone size={17} />
              {cloud.label} · Mở tài khoản để tiếp tục đồng bộ
              <ChevronRight size={16} />
            </button>
          )}
          {!online && (
            <div className="offline-banner">
              <WifiOff size={16} />
              Bạn đang ngoại tuyến. Đạo lộ vẫn tiếp tục, tiến trình lưu trên thiết bị.
            </div>
          )}
          {game.storageBlocked && (
            <div className="offline-banner error-banner">
              <CircleHelp size={16} />
              Bản lưu cũ gặp lỗi. Tạm dừng ghi đè để bảo vệ dữ liệu.
              <button onClick={() => setDialog('settings')}>Quản lý bản lưu</button>
            </div>
          )}
          {game.saveFailed && !game.storageBlocked && (
            <div className="offline-banner error-banner">
              <CircleHelp size={16} />
              Không thể tự lưu trên thiết bị. Hãy xuất bản lưu để bảo vệ tiến trình.
              <button onClick={exportSave}>Xuất bản lưu</button>
            </div>
          )}
          <div className="page-heading">
            <div>
              <span className="eyebrow">
                {view === 'dashboard'
                  ? 'CHÀO MỪNG TRỞ LẠI, ĐẠO HỮU'
                  : 'VÂN TIÊN KÝ · ĐẠO LỘ VÔ HẠN'}
              </span>
              <h1>
                {view === 'dashboard' ? 'Hôm nay, tiến thêm một bước.' : page.label}
                <span className="heading-seal">道</span>
              </h1>
              <p>
                {view === 'dashboard'
                  ? 'Không cần vội. Mỗi lần tĩnh tâm là một lần đến gần thiên đạo.'
                  : page.subtitle}
              </p>
            </div>
            <button className="text-button heading-help" onClick={() => setDialog('help')}>
              <CircleHelp size={16} />
              Đạo thư nhập môn
            </button>
          </div>

          {view === 'dashboard' && (
            <div className="community-quicklinks" aria-label="Tính năng nổi bật">
              <button onClick={() => moveTo('community')}>
                <Trophy size={18} />
                Bảng xếp hạng
              </button>
              <button onClick={() => moveTo('chat')}>
                <MessageCircle size={18} />
                Chat thế giới
              </button>
              <button onClick={() => moveTo('titles')}>
                <Crown size={18} />
                Sổ danh hiệu
              </button>
              <button onClick={() => moveTo('cultivation')}>
                <BookOpen size={18} />
                Cách đột phá
              </button>
            </div>
          )}
          {view === 'dashboard' && (
            <>
              <section className="hero-card">
                <Landscape />
                <div className="hero-wash" />
                <div className="hero-content">
                  <span className="hero-kicker">
                    <span />
                    ĐỊA GIỚI · THANH VÂN SƠN
                  </span>
                  <h2>
                    Một niệm tĩnh tâm.
                    <br />
                    Vạn dặm tiên lộ.
                  </h2>
                  <p>
                    Mây không hỏi đường về. Người tu hành
                    <br className="desktop-break" /> không quên nơi bắt đầu.
                  </p>
                  <button className="button primary" onClick={() => moveTo('world')}>
                    Bước vào tiên lộ
                    <ArrowUpRight size={16} />
                  </button>
                </div>
                <div className="hero-calligraphy">
                  <span>修</span>
                  <span>仙</span>
                  <small>
                    THUẬN ĐẠO
                    <br />
                    TỰ NHIÊN
                  </small>
                </div>
                <span className="hero-caption">Thanh Vân Sơn · Linh khí thanh thuần</span>
              </section>
              <div className="stat-strip">
                <div>
                  <span className="stat-icon green">
                    <Wind size={20} />
                  </span>
                  <span>
                    <small>Cảnh giới hiện tại</small>
                    <strong>
                      {REALMS[Math.floor(s.stage / 3)]}
                      <em>{STAGES[s.stage % 3]}</em>
                    </strong>
                  </span>
                  <button
                    className="stat-link"
                    aria-label="Xem các cảnh giới"
                    onClick={() => setDialog('realms')}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div>
                  <span className="stat-icon red">
                    <Heart size={19} />
                  </span>
                  <span>
                    <small>Sinh lực</small>
                    <strong>
                      {fmt(s.hp)}
                      <em>/ {fmt(st.maxHp)}</em>
                    </strong>
                    <Progress value={(s.hp / st.maxHp) * 100} color="red" label="Sinh lực" />
                  </span>
                </div>
                <div>
                  <span className="stat-icon gold">
                    <Zap size={19} />
                  </span>
                  <span>
                    <small>Thể lực</small>
                    <strong>
                      {fmt(s.stamina)}
                      <em>/ 100</em>
                    </strong>
                    <Progress value={s.stamina} color="gold" label="Thể lực" />
                  </span>
                  <button
                    className="stat-link"
                    aria-label="Nghỉ ngơi, 25 linh thạch"
                    onClick={() => act({ type: 'rest' })}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div>
                  <span className="stat-icon blue">
                    <Shield size={20} />
                  </span>
                  <span>
                    <small>Tông môn</small>
                    <strong className="sect-stat">{currentSect?.name || 'Tự do tu hành'}</strong>
                    <small className="stat-detail">
                      {s.sect
                        ? `${sectRank(s.contribution)} · ${s.contribution} cống hiến`
                        : 'Chưa gia nhập tông môn'}
                    </small>
                  </span>
                  <button
                    className="stat-link"
                    aria-label="Xem tông môn"
                    onClick={() => moveTo('sect')}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
              <div className="dashboard-middle">
                <section className="panel cultivation-panel">
                  <SectionTitle eyebrow="TĨNH TÂM · DƯỠNG KHÍ" title="Tu luyện">
                    <button
                      className="icon-button"
                      aria-label="Các cảnh giới tu luyện"
                      onClick={() => setDialog('realms')}
                    >
                      <BookOpen size={17} />
                    </button>
                  </SectionTitle>
                  <div className="cultivation-body">
                    <div className="cultivation-ring">
                      <svg viewBox="0 0 180 180" aria-hidden="true">
                        <circle className="ring-decoration" cx="90" cy="90" r="84" />
                        <circle className="ring-track" cx="90" cy="90" r="72" />
                        <circle
                          className="ring-value"
                          cx="90"
                          cy="90"
                          r="72"
                          pathLength="100"
                          strokeDasharray={`${Math.min(100, (s.xp / needed) * 100)} 100`}
                        />
                      </svg>
                      <div className="ring-center">
                        <span>道</span>
                        <small>{Math.min(100, Math.floor((s.xp / needed) * 100))}%</small>
                      </div>
                      <i className="ring-spark">
                        <Sparkles size={13} />
                      </i>
                    </div>
                    <div className="cultivation-info">
                      <Tag color="green">
                        <span className="status-dot" />
                        {ready ? 'Đạo cơ đã vững' : 'Linh khí đang hội tụ'}
                      </Tag>
                      <h3>
                        {REALMS[Math.floor(s.stage / 3)]}
                        <span>{STAGES[s.stage % 3]}</span>
                      </h3>
                      <p className="cultivation-progress">
                        {fmt(s.xp)}
                        <span> / {fmt(needed)} tu vi</span>
                      </p>
                      <p className="next-realm">
                        {s.stage === 59 ? (
                          'Cảnh giới tối thượng'
                        ) : (
                          <>
                            Tiếp theo: <strong>{realmName(s.stage + 1)}</strong>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="cultivation-actions">
                    <button
                      className="button primary"
                      onClick={() =>
                        act({ type: s.training.active ? 'stop-training' : 'meditate' })
                      }
                    >
                      <Wind size={17} />
                      {s.training.active ? 'Xuất định' : 'Tĩnh tâm tu luyện'}
                      <span>{s.training.active ? 'Dừng ngồi thiền' : 'Ngồi thiền'}</span>
                    </button>
                    <button
                      className={`button ${ready ? 'gold-button' : 'secondary'}`}
                      onClick={() => act({ type: 'breakthrough', method: breakthroughMethod })}
                      disabled={breakthrough.maxed || !!s.battle}
                      aria-describedby="breakthrough-requirements"
                    >
                      <Sparkles size={16} />
                      Đột phá
                    </button>
                  </div>
                  <div className="current-breakthrough-method">
                    <BookOpen size={18} />
                    <div>
                      <strong>{realmMethod.name}</strong>
                      <p>{realmMethod.ascending ? realmMethod.ascent : realmMethod.phases}</p>
                    </div>
                  </div>
                  <div className="breakthrough-path">
                    <label htmlFor="breakthrough-method">Phương thức đột phá</label>
                    <select
                      id="breakthrough-method"
                      value={breakthroughMethod}
                      onChange={(e) => setBreakthroughMethod(e.target.value as BreakthroughMethod)}
                    >
                      {BREAKTHROUGH_PATHS.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <p>
                      {BREAKTHROUGH_PATHS.find((p) => p.id === breakthroughMethod)!.description}
                    </p>
                  </div>
                  <div
                    className="breakthrough-requirements"
                    id="breakthrough-requirements"
                    aria-label="Yêu cầu đột phá"
                  >
                    <h4>
                      {breakthrough.maxed ? 'Đạo lộ viên mãn' : `Đột phá ${realmName(s.stage + 1)}`}
                    </h4>
                    {!breakthrough.maxed &&
                      breakthrough.resources.map((r) => (
                        <div
                          key={r.id}
                          className={`breakthrough-resource ${r.missing ? 'missing' : 'met'}`}
                        >
                          <span>{r.label}</span>
                          <span>
                            {fmt(r.have)} / {fmt(r.need)}{' '}
                            {r.missing ? `· Thiếu ${fmt(r.missing)}` : '· Đủ'}
                          </span>
                        </div>
                      ))}
                    <p>{breakthrough.message}</p>
                    {!breakthrough.maxed &&
                      breakthrough.resources.some(
                        (r) => r.missing && ['stones', 'immortal', 'divine'].includes(r.id),
                      ) && (
                        <button className="text-button" onClick={() => moveTo('world')}>
                          Đi kiếm thạch <ArrowUpRight size={13} />
                        </button>
                      )}
                  </div>
                  <div className={`training-status ${s.training.active ? 'active' : ''}`}>
                    <CultivatorArt active={s.training.active} />
                    <div>
                      <strong>
                        {s.training.active
                          ? `Đang ngồi thiền · ${Math.ceil(60 - s.training.remainder)}s đến chu kỳ tiếp`
                          : 'Tĩnh tâm rồi mới nhập đạo'}
                      </strong>
                      <p>
                        Tu vi +{(needed * 0.03 * st.cultivation).toFixed(1)}/phút · Linh khí +
                        {Math.floor((6 + s.stage) * st.cultivation)}/phút
                      </p>
                      <span>
                        <Sparkles size={13} />
                        {fmt(s.lingqi)} linh khí · Đột phá cần{' '}
                        {breakthrough.resources.find((r) => r.id === 'qi')!.need}
                        {realmCoins ? ` + ${realmCoins.amount} ${tierLabel(realmCoins.kind)}` : ''}
                      </span>
                      <small>
                        Đã ngồi thiền {Math.floor(s.training.totalSeconds / 60)} phút · Ngoại tuyến
                        nhận tối đa 2 giờ
                      </small>
                    </div>
                  </div>
                  <div className="cultivation-foot">
                    <span>
                      <Leaf size={13} />
                      Hiệu suất{' '}
                      {Math.round(st.cultivation * (s.incenseUntil > Date.now() ? 1.2 : 1) * 100)}%
                    </span>
                    <button onClick={() => act({ type: 'incense' })}>
                      {s.incenseUntil > Date.now() ? (
                        <>
                          <Flame size={13} />
                          Hương đang cháy
                        </>
                      ) : (
                        <>
                          <Flame size={13} />
                          Thắp hương · 50 <Gem size={11} />
                        </>
                      )}
                    </button>
                  </div>
                </section>
                <section className="panel daily-panel">
                  <SectionTitle eyebrow="CƠ DUYÊN ĐANG CHỜ" title="Nhiệm vụ của bạn">
                    <button className="text-button" onClick={() => moveTo('quests')}>
                      Xem tất cả
                      <ChevronRight size={14} />
                    </button>
                  </SectionTitle>
                  <div className="dashboard-quests">
                    {availableQuests.slice(0, 3).map((q) => (
                      <QuestRow
                        key={q.id}
                        quest={q}
                        state={s}
                        onClaim={() => act({ type: 'quest', id: q.id })}
                      />
                    ))}
                    {availableQuests.length === 0 && (
                      <Empty
                        title="Đạo lộ rộng mở"
                        description="Tu luyện lên cảnh giới tiếp theo để mở thêm nhiệm vụ."
                      />
                    )}
                  </div>
                  <div className="daily-note">
                    <ScrollText size={15} />
                    <span>Nhiệm vụ hằng ngày làm mới lúc 00:00 (giờ Việt Nam).</span>
                  </div>
                </section>
              </div>
              <div className="dashboard-bottom">
                <section className="explore-section">
                  <SectionTitle eyebrow="SƠN HÀ RỘNG LỚN" title="Đi đâu hôm nay?">
                    <button className="text-button" onClick={() => moveTo('world')}>
                      Bản đồ tam giới
                      <ArrowUpRight size={14} />
                    </button>
                  </SectionTitle>
                  <div className="dashboard-map-grid">
                    {MAPS.slice(0, 3).map((map) => (
                      <MapCard
                        key={map.id}
                        map={map}
                        state={s}
                        onExplore={() => explore(map.id)}
                        onBestiary={() => setBestiaryMap(map.id)}
                      />
                    ))}
                  </div>
                </section>
                <section className="panel journal-panel">
                  <SectionTitle eyebrow="MỖI BƯỚC MỘT CÂU CHUYỆN" title="Nhật ký tiên lộ">
                    <button
                      className="icon-button"
                      aria-label="Xem toàn bộ nhật ký"
                      onClick={() => setDialog('events')}
                    >
                      <Clock3 size={17} />
                    </button>
                  </SectionTitle>
                  <div className="journal-list">
                    {s.events.slice(0, 4).map((event, i) => (
                      <div className={`journal-entry ${event.type}`} key={event.id}>
                        <span className="journal-node" />
                        <div>
                          <small>
                            {i === 0
                              ? 'Gần đây nhất'
                              : new Date(event.time).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                          </small>
                          <p>{event.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="journal-footer">
                    <span className="status-dot" />
                    {game.saveFailed || game.storageBlocked
                      ? 'Cần sao lưu tiến trình trong Cài đặt'
                      : 'Đạo lộ tự động lưu trên thiết bị'}
                  </div>
                </section>
              </div>
              {showTip && (
                <div className="wisdom-bar">
                  <span className="wisdom-icon">悟</span>
                  <div>
                    <strong>Chậm một chút, xa một chút.</strong>
                    <span>
                      Ghé thăm Vân Hạc Chân Nhân ở Thanh Trúc Lâm. Có những cơ duyên chỉ mở ra sau
                      một cuộc trò chuyện.
                    </span>
                  </div>
                  <button
                    className="icon-button"
                    aria-label="Ẩn lời nhắc"
                    onClick={() => setShowTip(false)}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </>
          )}

          {view === 'world' && (
            <>
              <div className="world-tabs" role="tablist" aria-label="Các giới">
                {WORLDS.map((w, i) => (
                  <button
                    key={w.id}
                    role="tab"
                    aria-selected={world === w.id}
                    className={world === w.id ? 'selected' : ''}
                    onClick={() => setWorld(w.id)}
                  >
                    <span className="world-number">0{i + 1}</span>
                    <span>
                      <strong>{w.name}</strong>
                      <small>{w.sub}</small>
                    </span>
                    {s.stage < w.minStage ? <LockKeyhole size={18} /> : <Check size={17} />}
                  </button>
                ))}
              </div>
              <section className="world-banner">
                <Landscape
                  terrain={world === 'earth' ? 'forest' : 'temple'}
                  night={world === 'divine'}
                />
                <div>
                  <Tag color="green">
                    <Compass size={12} />
                    {world === 'earth'
                      ? 'Vùng đất khởi nguyên'
                      : s.stage >= WORLDS.find((w) => w.id === world)!.minStage
                        ? 'Cánh cửa đã khai mở'
                        : `Cần ${realmName(WORLDS.find((w) => w.id === world)!.minStage)}`}
                  </Tag>
                  <h2>{WORLDS.find((w) => w.id === world)!.name}</h2>
                  <p>{WORLDS.find((w) => w.id === world)!.description}</p>
                </div>
              </section>
              <div className="section-meta">
                <span>
                  <Footprints size={16} />
                  {s.explored.length} / 12 địa điểm đã khám phá
                </span>
                <span>
                  <Zap size={15} />
                  Thể lực {fmt(s.stamina)}/100 · Mỗi lượt tốn 8
                </span>
              </div>
              <div className="world-map-grid">
                {MAPS.filter((m) => m.world === world).map((map) => (
                  <MapCard
                    key={map.id}
                    map={map}
                    state={s}
                    onExplore={() => explore(map.id)}
                    onBestiary={() => setBestiaryMap(map.id)}
                  />
                ))}
              </div>
              <SectionTitle eyebrow="SAU MÀN SƯƠNG LÀ MỘT BÍ MẬT" title="Bí cảnh ẩn" />
              <SecretPanel
                state={s}
                world={world}
                onChallenge={(secretId) => act({ type: 'challenge', secretId })}
              />
              <SectionTitle eyebrow="GẶP GỠ TRÊN TIÊN LỘ" title="Nhân duyên" />
              <div className="npc-grid">
                {NPCS.filter((n) => MAPS.find((m) => m.id === n.mapId)!.world === world).map(
                  (npc) => (
                    <button
                      className="npc-card panel"
                      key={npc.id}
                      disabled={s.stage < npc.minStage}
                      onClick={() => {
                        if (act({ type: 'npc', npcId: npc.id, choice: 'talk' })) setNpcId(npc.id);
                      }}
                    >
                      <span className="npc-avatar">
                        <UserRound size={30} />
                        <small>{npc.symbol}</small>
                      </span>
                      <span>
                        <small>{npc.role}</small>
                        <strong>{npc.name}</strong>
                        <em>
                          {s.stage < npc.minStage
                            ? realmName(npc.minStage)
                            : MAPS.find((m) => m.id === npc.mapId)!.name}
                        </em>
                      </span>
                      {s.stage < npc.minStage ? (
                        <LockKeyhole size={17} />
                      ) : (
                        <ChevronRight size={18} />
                      )}
                    </button>
                  ),
                )}
              </div>
            </>
          )}

          {view === 'bag' && (
            <>
              <div className="bag-layout">
                <section className="panel equipment-panel">
                  <SectionTitle eyebrow="PHÁP KHÍ HỘ THÂN" title="Trang bị">
                    <Tag color="green">7 vị trí</Tag>
                  </SectionTitle>
                  <div className="equipment-character">
                    <div className="character-aura" />
                    <span className="character-glyph">仙</span>
                    <span className="character-name">{s.name}</span>
                  </div>
                  <div className="equipment-slots">
                    {SLOTS.map((slot) => (
                      <div key={slot.id} className="equipment-slot">
                        <small>{slot.name}</small>
                        {s.equipped[slot.id] ? (
                          <GearTile
                            gear={s.equipped[slot.id]!}
                            onClick={() => setSelectedGear(s.equipped[slot.id]!.uid)}
                            selected={selectedGear === s.equipped[slot.id]!.uid}
                          />
                        ) : (
                          <button
                            className="empty-slot"
                            onClick={() => {
                              setBagTab('gear');
                              tell(`Chọn ${slot.name.toLowerCase()} trong ba lô để trang bị.`);
                            }}
                            aria-label={`Trang bị ${slot.name}`}
                          >
                            <Plus size={20} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="equipment-stats">
                    <span>
                      <Swords size={16} />
                      Công kích<strong>{fmt(st.attack)}</strong>
                    </span>
                    <span>
                      <Shield size={16} />
                      Phòng thủ<strong>{fmt(st.defense)}</strong>
                    </span>
                    <span>
                      <Heart size={16} />
                      Sinh lực<strong>{fmt(st.maxHp)}</strong>
                    </span>
                  </div>
                </section>
                <section className="panel inventory-panel">
                  <SectionTitle eyebrow="TÚI CÀN KHÔN" title="Ba lô">
                    <span className="capacity">
                      <Backpack size={15} />
                      {bagUsed(s)} / 120
                    </span>
                  </SectionTitle>
                  <div className="inventory-toolbar">
                    <div className="filter-tabs">
                      {(['all', 'gear', 'items'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setBagTab(t)}
                          className={bagTab === t ? 'active' : ''}
                        >
                          {t === 'all' ? 'Tất cả' : t === 'gear' ? 'Trang bị' : 'Vật phẩm'}
                        </button>
                      ))}
                    </div>
                    <label className="search-box">
                      <Search size={15} />
                      <input
                        value={bagSearch}
                        onChange={(e) => setBagSearch(e.target.value)}
                        placeholder="Tìm vật phẩm"
                        aria-label="Tìm vật phẩm"
                      />
                    </label>
                  </div>
                  <div className="inventory-grid">
                    {bagTab !== 'items' &&
                      s.bag
                        .filter((g) =>
                          `${RANKS[g.rank].prefix} ${SLOTS.find((slot) => slot.id === g.slot)!.name} ${RANKS[g.rank].name}`
                            .toLowerCase()
                            .includes(bagSearch.toLowerCase()),
                        )
                        .map((g) => (
                          <div className="inventory-cell" key={g.uid}>
                            <GearTile
                              gear={g}
                              onClick={() => setSelectedGear(g.uid)}
                              selected={selectedGear === g.uid}
                            />
                            <strong>{RANKS[g.rank].prefix}</strong>
                            <small>{SLOTS.find((slot) => slot.id === g.slot)!.name}</small>
                          </div>
                        ))}
                    {bagTab !== 'gear' &&
                      (Object.keys(ITEMS) as ItemId[])
                        .filter(
                          (id) =>
                            (s.inventory[id] || 0) > 0 &&
                            ITEMS[id].name.toLowerCase().includes(bagSearch.toLowerCase()),
                        )
                        .map((id) => (
                          <div className="inventory-cell material-cell" key={id}>
                            <button
                              className="material-tile"
                              onClick={() => {
                                if (id === 'pill' || id === 'elixir')
                                  act({ type: 'use', item: id });
                                else tell(ITEMS[id].description);
                              }}
                              aria-label={`${ITEMS[id].name}, số lượng ${s.inventory[id]}`}
                            >
                              <span>{ITEMS[id].symbol}</span>
                              <b>×{s.inventory[id]}</b>
                            </button>
                            <strong>{ITEMS[id].name}</strong>
                            <small>
                              {id === 'pill' || id === 'elixir' ? 'Nhấn để sử dụng' : 'Nguyên liệu'}
                            </small>
                          </div>
                        ))}
                  </div>
                  {((bagTab === 'gear' && s.bag.length === 0) ||
                    (bagTab === 'items' && Object.values(s.inventory).every((n) => !n))) && (
                    <Empty
                      icon={<Backpack size={34} />}
                      title="Ba lô đang nhẹ tênh"
                      description="Khám phá thế giới hoặc ghé thương hội để thu thập vật phẩm."
                    />
                  )}
                  <div className="inventory-note">
                    <CircleHelp size={15} />
                    Nhấn trang bị để xem chi tiết, đan dược để sử dụng. 6 ô dành riêng cho vật phẩm
                    xếp chồng.
                  </div>
                </section>
              </div>
              {selected && (
                <section
                  ref={gearDetail}
                  className="panel gear-detail"
                  style={{ '--rank': RANKS[selected.rank].color } as React.CSSProperties}
                >
                  <GearTile gear={selected} />
                  <div className="gear-detail-info">
                    <Tag>{RANKS[selected.rank].name}</Tag>
                    <h3>
                      {RANKS[selected.rank].prefix} ·{' '}
                      {SLOTS.find((slot) => slot.id === selected.slot)!.name}
                      {selected.level > 0 ? ` +${selected.level}` : ''}
                    </h3>
                    <p>
                      Sức mạnh {gearPower(selected)} ·{' '}
                      {isEquipped ? 'Đang trang bị' : 'Trong ba lô'} · Cường hóa {selected.level}/10
                    </p>
                    {isEquipped && (
                      <small>
                        Lần cường hóa tiếp: 1 tinh hoa +{' '}
                        {30 * (selected.level + 1) * (selected.rank + 1)} linh thạch
                      </small>
                    )}
                  </div>
                  <div className="gear-detail-actions">
                    {isEquipped ? (
                      <>
                        <button
                          className="button primary"
                          disabled={selected.level >= 10}
                          onClick={() => act({ type: 'upgrade', slot: selected.slot })}
                        >
                          <Hammer size={16} />
                          Cường hóa
                        </button>
                        <button
                          className="button secondary"
                          onClick={() => act({ type: 'unequip', slot: selected.slot })}
                        >
                          Tháo
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="button primary"
                          onClick={() => act({ type: 'equip', uid: selected.uid })}
                        >
                          <Plus size={16} />
                          Trang bị
                        </button>
                        <button
                          className="button secondary"
                          onClick={() => {
                            act({ type: 'salvage', uid: selected.uid });
                            setSelectedGear(null);
                          }}
                        >
                          Phân giải · +{selected.rank + 1} tinh hoa
                        </button>
                      </>
                    )}
                  </div>
                </section>
              )}
              <section className="rank-guide">
                <SectionTitle eyebrow="TỪ PHÀM ĐẾN THẦN" title="Cửu phẩm pháp khí" />
                <div>
                  {RANKS.map((r, i) => (
                    <span key={r.name} style={{ color: r.color }}>
                      <i style={{ background: r.color }} />
                      {r.name}
                      {i < 8 && <ChevronRight size={12} />}
                    </span>
                  ))}
                </div>
              </section>
            </>
          )}

          {view === 'quests' && (
            <>
              <div className="quest-summary">
                <div>
                  <ScrollText size={24} />
                  <span>
                    <strong>{s.claimed.length}</strong>
                    <small>Cơ duyên đã hoàn thành</small>
                  </span>
                </div>
                <div>
                  <CircleCheck size={24} />
                  <span>
                    <strong>{claimCount}</strong>
                    <small>Phần thưởng đang chờ</small>
                  </span>
                </div>
                <div>
                  <Eye size={24} />
                  <span>
                    <strong>
                      {QUESTS.filter((q) => q.category === 'hidden' && q.reveal?.(s)).length} / 4
                    </strong>
                    <small>Cơ duyên ẩn đã tìm thấy</small>
                  </span>
                </div>
              </div>
              <div className="section-meta">
                <div className="filter-tabs big">
                  {(['main', 'daily', 'hidden'] as const).map((t) => (
                    <button
                      className={questTab === t ? 'active' : ''}
                      key={t}
                      onClick={() => setQuestTab(t)}
                    >
                      {t === 'main' ? 'Đạo lộ chính' : t === 'daily' ? 'Hằng ngày' : 'Cơ duyên ẩn'}
                    </button>
                  ))}
                </div>
                {questTab === 'daily' && (
                  <span>
                    <Clock3 size={14} />
                    Làm mới 00:00 · giờ Việt Nam
                  </span>
                )}
              </div>
              <div className="quest-list panel">
                {QUESTS.filter((q) => q.category === questTab && (!q.reveal || q.reveal(s))).map(
                  (q) => (
                    <QuestRow
                      key={q.id}
                      quest={q}
                      state={s}
                      full
                      onClaim={() => act({ type: 'quest', id: q.id })}
                    />
                  ),
                )}
                {questTab === 'hidden' &&
                  QUESTS.filter((q) => q.category === 'hidden' && !q.reveal?.(s)).map((q) => (
                    <div className="hidden-quest" key={q.id}>
                      <span>
                        <LockKeyhole size={21} />
                      </span>
                      <div>
                        <h3>Một cơ duyên chưa biết</h3>
                        <p>
                          {q.id === 'hidden-elder'
                            ? 'Có người đang đợi bạn giữa rừng trúc…'
                            : q.id === 'hidden-wanderer'
                              ? 'Những người đi xa thường thấy điều người khác bỏ lỡ…'
                              : q.id === 'hidden-sword'
                                ? 'Một kiếm khách đang giữ câu chuyện của cổ ngọc…'
                                : 'Sơn môn nhớ tấm lòng của những đệ tử tận tâm…'}
                        </p>
                      </div>
                      <Tag>Chưa khám phá</Tag>
                    </div>
                  ))}
              </div>
            </>
          )}

          {view === 'sect' && (
            <>
              {s.sect ? (
                <section className="sect-home panel">
                  <Landscape terrain="temple" />
                  <div className="sect-home-content">
                    <span className="sect-emblem">{currentSect!.symbol}</span>
                    <Tag color="green">TÔNG MÔN CỦA BẠN</Tag>
                    <h2>{currentSect!.name}</h2>
                    <p>{currentSect!.motto}</p>
                    <div className="sect-member-stats">
                      <span>
                        <small>Thân phận</small>
                        <strong>
                          {s.sect === 'custom'
                            ? 'Tông chủ'
                            : `Đệ tử ${sectRank(s.contribution).toLowerCase()}`}
                        </strong>
                      </span>
                      <span>
                        <small>Cống hiến</small>
                        <strong>{s.contribution}</strong>
                      </span>
                      <span>
                        <small>Tông môn gia trì</small>
                        <strong>{currentSect!.bonus}</strong>
                      </span>
                    </div>
                    <button className="button primary" onClick={() => act({ type: 'donate' })}>
                      <Leaf size={17} />
                      Đóng góp · 50 linh thạch
                      <Plus size={15} />
                    </button>
                    <small className="donation-note">
                      +25 cống hiến mỗi lần · Mỗi 3 lần nhận 1 Tụ Linh Đan
                    </small>
                  </div>
                </section>
              ) : (
                <div className="intro-note">
                  <Castle size={24} />
                  <div>
                    <h3>Một mình có thể đi nhanh. Đồng môn giúp bạn đi xa.</h3>
                    <p>
                      Chọn một tông môn để nhận gia trì vĩnh viễn. Mỗi tông môn có đạo pháp riêng;
                      hãy chọn theo cách tu hành của bạn.
                    </p>
                  </div>
                </div>
              )}
              <SectionTitle
                eyebrow="CỬU ĐẠI SƠN MÔN"
                title={s.sect ? 'Những sơn môn trong thiên hạ' : 'Tìm nơi thuộc về'}
              />
              <CustomSectPanel state={s} act={act} />
              <div className="sect-grid">
                {SECTS.map((sect, i) => (
                  <article
                    key={sect.id}
                    className={`sect-card panel ${s.sect === sect.id ? 'joined' : ''}`}
                  >
                    <div className={`sect-card-art sect-art-${i}`}>
                      <Landscape terrain={i === 2 ? 'lake' : i === 0 ? 'mountain' : 'temple'} />
                      <span>{sect.symbol}</span>
                    </div>
                    <div className="sect-card-content">
                      <small>{sect.motto}</small>
                      <h3>{sect.name}</h3>
                      <p>{sect.description}</p>
                      <Tag color="green">
                        <Sparkles size={12} />
                        {sect.bonus}
                      </Tag>
                      <button
                        className={`button ${s.sect === sect.id ? 'secondary' : 'primary'}`}
                        disabled={Boolean(s.sect)}
                        onClick={() => act({ type: 'join', sectId: sect.id })}
                      >
                        {s.sect === sect.id ? (
                          <>
                            <Check size={16} />
                            Đã gia nhập
                          </>
                        ) : s.sect ? (
                          'Tông môn khác'
                        ) : (
                          <>
                            Bái nhập sơn môn
                            <ArrowUpRight size={16} />
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="sect-rank-track panel">
                <h3>Đạo lộ trong sơn môn</h3>
                {[
                  { name: 'Ngoại môn', need: 0 },
                  { name: 'Nội môn', need: 150 },
                  { name: 'Chân truyền', need: 400 },
                  { name: 'Trưởng lão', need: 1000 },
                ].map((r, i) => (
                  <div
                    key={r.name}
                    className={s.sect && s.contribution >= r.need ? 'attained' : ''}
                  >
                    <span>0{i + 1}</span>
                    <strong>{r.name}</strong>
                    <small>{r.need} cống hiến</small>
                  </div>
                ))}
              </div>
            </>
          )}

          {view === 'craft' && (
            <>
              <section className="craft-banner panel">
                <span className="craft-glyph">丹</span>
                <div>
                  <span className="eyebrow">BÁCH NGHỆ TU CHÂN</span>
                  <h2>Một lò đan, ngàn cơ duyên.</h2>
                  <p>
                    Dùng nguyên liệu từ khám phá và chiến đấu để luyện đan, đúc pháp khí.
                    <br />
                    Phẩm chất trang bị chế tạo tăng theo tu vi của bạn.
                  </p>
                </div>
                <div className="craft-resources">
                  <span>
                    <Leaf size={18} />
                    Linh thảo<strong>{s.inventory.herb || 0}</strong>
                  </span>
                  <span>
                    <Hammer size={18} />
                    Huyền thiết<strong>{s.inventory.ore || 0}</strong>
                  </span>
                  <span>
                    <Gem size={18} />
                    Tinh hoa<strong>{s.inventory.essence || 0}</strong>
                  </span>
                </div>
              </section>
              <div className="recipe-grid">
                {[
                  {
                    id: 'pill' as const,
                    name: 'Hồi Xuân Đan',
                    symbol: '丹',
                    type: 'ĐAN DƯỢC · PHỤC HỒI',
                    description:
                      'Hồi 50% sinh lực tối đa. Có thể sử dụng trong chiến đấu, thay cho một lượt công kích.',
                    material: 'herb' as ItemId,
                    amount: 3,
                    cost: 15,
                  },
                  {
                    id: 'elixir' as const,
                    name: 'Tụ Linh Đan',
                    symbol: '灵',
                    type: 'ĐAN DƯỢC · TU LUYỆN',
                    description:
                      'Hấp thu linh khí cô đọng, nhận 35% tu vi cần thiết của cảnh giới hiện tại.',
                    material: 'herb' as ItemId,
                    amount: 5,
                    cost: 35,
                  },
                  {
                    id: 'gear' as const,
                    name: 'Đúc pháp khí',
                    symbol: '器',
                    type: 'LUYỆN KHÍ · TRANG BỊ',
                    description: `Chế tạo một trang bị ngẫu nhiên. Phẩm cơ bản: ${RANKS[Math.min(8, Math.floor(s.stage / 7))].name}. Có 20% cơ hội tăng một phẩm.`,
                    material: 'ore' as ItemId,
                    amount: 3,
                    cost: 45,
                  },
                ].map((r) => (
                  <article className="recipe-card panel" key={r.id}>
                    <span className="recipe-symbol">{r.symbol}</span>
                    <small className="eyebrow">{r.type}</small>
                    <h3>{r.name}</h3>
                    <p>{r.description}</p>
                    <div className="recipe-ingredients">
                      <span
                        className={(s.inventory[r.material] || 0) >= r.amount ? '' : 'insufficient'}
                      >
                        <Leaf size={14} />
                        {r.amount} {ITEMS[r.material].name}
                      </span>
                      <span className={s.stones >= r.cost ? '' : 'insufficient'}>
                        <Gem size={14} />
                        {r.cost} linh thạch
                      </span>
                    </div>
                    <button
                      className="button primary"
                      onClick={() => act({ type: 'craft', recipe: r.id })}
                      disabled={(s.inventory[r.material] || 0) < r.amount || s.stones < r.cost}
                    >
                      <Flame size={16} />
                      {r.id === 'gear' ? 'Khai lò luyện khí' : 'Khai lò luyện đan'}
                    </button>
                  </article>
                ))}
              </div>
              <div className="craft-tip panel">
                <Hammer size={27} />
                <div>
                  <h3>Pháp khí còn có thể mạnh hơn</h3>
                  <p>
                    Phân giải trang bị không dùng để nhận tinh hoa. Cường hóa trang bị đến +10 trong
                    Ba lô, mỗi cấp tăng 16% sức mạnh cơ bản.
                  </p>
                </div>
                <button className="button secondary" onClick={() => moveTo('bag')}>
                  Đến ba lô
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </>
          )}

          {view === 'character' && (
            <>
              <div className="profile-layout">
                <section className="panel profile-card">
                  <span className="profile-avatar">{raceInfo.symbol}</span>
                  <Tag color="green">{raceInfo.name}</Tag>
                  <h2>{s.name}</h2>
                  <TitleBadge title={honor} animated={s.titles.effects} />
                  <button className="text-button" onClick={() => moveTo('titles')}>
                    <Crown size={14} />
                    {honor ? 'Đổi danh hiệu' : 'Chọn danh hiệu'}
                  </button>
                  <p>{realmName(s.stage)}</p>
                  <div className="profile-stats">
                    {[
                      { icon: Heart, label: 'Sinh lực', value: st.maxHp },
                      { icon: Swords, label: 'Công kích', value: st.attack },
                      { icon: Shield, label: 'Phòng thủ', value: st.defense },
                      { icon: Zap, label: 'Chí mạng', value: `${Math.round(st.crit * 100)}%` },
                      {
                        icon: Wind,
                        label: 'Tu luyện',
                        value: `${Math.round(st.cultivation * 100)}%`,
                      },
                    ].map((row) => (
                      <div key={row.label}>
                        <row.icon size={17} />
                        <span>{row.label}</span>
                        <strong>
                          {typeof row.value === 'number' ? fmt(row.value) : row.value}
                        </strong>
                      </div>
                    ))}
                  </div>
                  <button className="button secondary" onClick={() => setDialog('realms')}>
                    Xem đạo lộ 20 cảnh giới
                    <ChevronRight size={16} />
                  </button>
                </section>
                <section className="panel profile-editor">
                  <SectionTitle eyebrow="DANH TỰ VÀ HUYẾT MẠCH" title="Đạo hiệu của bạn" />
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      act({ type: 'profile', name, race: s.raceChosen ? undefined : race });
                    }}
                  >
                    <label className="field-label" htmlFor="name">
                      Đạo hiệu <span>Tối đa 24 ký tự</span>
                    </label>
                    <input
                      id="name"
                      className="text-input"
                      value={name}
                      maxLength={24}
                      required
                      onChange={(e) => setName(e.target.value)}
                    />
                    <div className="race-heading">
                      <h3>Chọn chủng tộc</h3>
                      <Tag>{s.raceChosen ? 'Huyết mạch đã xác định' : 'Chỉ được chọn một lần'}</Tag>
                    </div>
                    <div className="race-options">
                      {RACES.map((r) => (
                        <label
                          className={`race-option ${race === r.id ? 'selected' : ''} ${s.raceChosen && s.race !== r.id ? 'unavailable' : ''}`}
                          key={r.id}
                        >
                          <input
                            type="radio"
                            name="race"
                            value={r.id}
                            checked={race === r.id}
                            disabled={s.raceChosen}
                            onChange={() => setRace(r.id)}
                          />
                          <span className="race-symbol">{r.symbol}</span>
                          <span>
                            <strong>{r.name}</strong>
                            <small>{r.description}</small>
                            <em>{r.bonus}</em>
                          </span>
                          {race === r.id && <CircleCheck size={18} />}
                        </label>
                      ))}
                    </div>
                    <button className="button primary" type="submit">
                      <Check size={16} />
                      Lưu đạo hiệu{s.raceChosen ? '' : ' & huyết mạch'}
                    </button>
                  </form>
                </section>
              </div>
              <section className="panel achievements">
                <SectionTitle eyebrow="DẤU CHÂN TRÊN TIÊN LỘ" title="Thành tựu" />
                <div>
                  {[
                    { name: 'Tĩnh tâm', value: s.metrics.meditations, icon: Wind },
                    { name: 'Trừ yêu', value: s.metrics.kills, icon: Swords },
                    { name: 'Đột phá', value: s.metrics.breakthroughs, icon: Sparkles },
                    { name: 'Xuất hành', value: s.metrics.explorations, icon: Footprints },
                    { name: 'Luyện chế', value: s.metrics.crafts, icon: FlaskConical },
                    { name: 'Nhân duyên', value: s.npcMet.length, icon: Bird },
                  ].map((a) => (
                    <div key={a.name}>
                      <a.icon size={21} />
                      <strong>{fmt(a.value)}</strong>
                      <small>{a.name}</small>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
          {view === 'manuals' && <ManualsPanel state={s} act={act} />}
          {view === 'lineage' && <LineagePanel state={s} act={act} />}
          {view === 'titles' && <TitlePanel state={s} act={act} />}
          {view === 'chat' && (
            <ChatPanel state={s} cloud={cloud} onLogin={() => setDialog('account')} />
          )}
          {view === 'cultivation' && (
            <CultivationGuide state={s} onCultivate={() => moveTo('dashboard')} />
          )}
          {view === 'dungeons' && <DungeonsPanel state={s} act={act} />}
          {view === 'community' && (
            <CommunityPanel
              state={s}
              act={act}
              community={community}
              loggedIn={!!cloud.account}
              onLogin={() => setDialog('account')}
            />
          )}
          {view === 'dashboard' && (
            <div className="feature-shortcuts">
              {[
                {
                  id: 'manuals' as View,
                  icon: BookOpen,
                  name: 'Tàng kinh các',
                  text: '15 bí kíp, 3 đạo pháp đồng hành',
                },
                {
                  id: 'dungeons' as View,
                  icon: Skull,
                  name: 'Thí luyện phó bản',
                  text: 'Ba cửa chiến đấu, chiến lợi phẩm quý',
                },
                {
                  id: 'community' as View,
                  icon: Trophy,
                  name: 'Thiên bảng & boss',
                  text: community.data
                    ? `${community.data.onlineCount} đạo hữu đang online`
                    : 'Cùng đạo hữu viết tên lên thiên bảng',
                },
              ].map((f) => (
                <button className="panel feature-shortcut" key={f.id} onClick={() => moveTo(f.id)}>
                  <f.icon size={27} />
                  <div>
                    <strong>{f.name}</strong>
                    <span>{f.text}</span>
                  </div>
                  <ChevronRight size={18} />
                </button>
              ))}
            </div>
          )}
          <footer className="page-footer">
            <span>
              <Mountain size={15} />
              Vân Tiên Ký
            </span>
            <p>Mỗi người một đạo lộ. Mỗi niệm một thế giới.</p>
            <button onClick={() => setDialog(cloud.account ? 'account' : 'settings')}>
              {cloud.account ? `Bản 1.4 · ${cloud.label}` : 'Bản 1.4 · Lưu cục bộ'}
            </button>
          </footer>
        </main>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Điều hướng trên điện thoại">
        {navigation.slice(0, 5).map((n) => (
          <button key={n.id} className={view === n.id ? 'active' : ''} onClick={() => moveTo(n.id)}>
            <n.icon size={20} />
            <span>{n.label}</span>
            {n.id === 'quests' && claimCount > 0 && <i />}
          </button>
        ))}
      </nav>
      {notice && (
        <div className={`toast ${notice.ok ? '' : 'error'}`} role="status" key={notice.id}>
          {notice.ok ? <CircleCheck size={19} /> : <CircleHelp size={19} />}
          <span>{notice.text}</span>
          <button aria-label="Đóng thông báo" onClick={game.dismissNotice}>
            <X size={16} />
          </button>
        </div>
      )}

      {dialog === 'account' && (
        <Modal
          title="Tài khoản & đồng bộ"
          subtitle="Giữ đạo lộ bên bạn, từ PC đến Android."
          onClose={() => setDialog(null)}
        >
          <AccountPanel cloud={cloud} state={s} />
        </Modal>
      )}
      {dialog === 'shop' && (
        <Modal
          title="Vạn Bảo Thương Hội"
          subtitle={`Linh thạch hiện có: ${fmt(s.stones)} · Mua và bán vật phẩm`}
          onClose={() => setDialog(null)}
          wide
        >
          <CurrencyPanel state={s} act={act} />
          <div className="shop-grid">
            {(Object.keys(ITEMS) as ItemId[]).map((id) => (
              <div className="shop-item" key={id}>
                <span className="shop-symbol">{ITEMS[id].symbol}</span>
                <div>
                  <h3>{ITEMS[id].name}</h3>
                  <p>{ITEMS[id].description}</p>
                  <small>Đang có: {s.inventory[id] || 0}</small>
                  <div className="shop-buttons">
                    <button
                      className="button primary"
                      disabled={s.stones < ITEMS[id].price}
                      onClick={() => act({ type: 'buy', item: id })}
                    >
                      Mua · {ITEMS[id].price}
                      <Gem size={12} />
                    </button>
                    <button
                      className="button secondary"
                      disabled={!(s.inventory[id] || 0)}
                      onClick={() => act({ type: 'sell', item: id })}
                    >
                      Bán · {Math.floor(ITEMS[id].price * 0.5)}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {dialog === 'realms' && (
        <Modal
          title="Hai mươi cảnh giới tu hành"
          subtitle="Mỗi cảnh giới gồm Sơ kỳ, Trung kỳ và Đỉnh phong. Đột phá luôn thành công khi đủ tu vi, linh khí và thạch tương ứng với cảnh giới."
          onClose={() => setDialog(null)}
          wide
        >
          <div className="realm-list">
            <button
              className="button secondary"
              onClick={() => {
                setDialog(null);
                moveTo('cultivation');
              }}
            >
              <BookOpen size={16} />
              Xem cách đột phá từng tu vi
            </button>
            {REALMS.map((realm, i) => (
              <div
                className={`${i === Math.floor(s.stage / 3) ? 'current' : ''} ${i < Math.floor(s.stage / 3) ? 'completed' : ''}`}
                key={realm}
              >
                <span>{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <h3>
                    {realm}
                    {i === 9 && <Tag>Tiên giới khai mở</Tag>}
                    {i === 16 && <Tag>Thần giới khai mở</Tag>}
                  </h3>
                  <p>
                    {STAGES.map((stage, j) => (
                      <em key={stage} className={s.stage >= i * 3 + j ? 'reached' : ''}>
                        {s.stage > i * 3 + j ? (
                          <Check size={11} />
                        ) : s.stage === i * 3 + j ? (
                          <span className="status-dot" />
                        ) : (
                          <span className="realm-empty-dot" />
                        )}
                        {stage}
                      </em>
                    ))}
                  </p>
                </div>
                {i === Math.floor(s.stage / 3) ? (
                  <Tag color="green">Hiện tại</Tag>
                ) : i < Math.floor(s.stage / 3) ? (
                  <CircleCheck size={18} />
                ) : (
                  <LockKeyhole size={15} />
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}
      {dialog === 'events' && (
        <Modal
          title="Nhật ký tiên lộ"
          subtitle="60 sự kiện gần nhất trên con đường tu hành của bạn."
          onClose={() => setDialog(null)}
        >
          <div className="event-history">
            {s.events.map((e) => (
              <div key={e.id} className={e.type}>
                <span>
                  {e.type === 'realm' ? (
                    <Sparkles size={17} />
                  ) : e.type === 'battle' ? (
                    <Swords size={17} />
                  ) : e.type === 'story' ? (
                    <ScrollText size={17} />
                  ) : (
                    <Leaf size={17} />
                  )}
                </span>
                <div>
                  <small>
                    {new Date(e.time).toLocaleString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </small>
                  <p>{e.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {dialog === 'notifications' && (
        <Modal
          title="Thông báo tam giới"
          subtitle="Boss hồi sinh, đạo hữu online và cơ duyên đang chờ."
          onClose={() => setDialog(null)}
        >
          <div className="notification-tools">
            <button className="text-button" onClick={alerts.markRead}>
              Đánh dấu tất cả đã đọc
            </button>
            <button className="text-button" onClick={() => setDialog('events')}>
              Nhật ký hành trình
            </button>
          </div>
          <div className="notification-list">
            {alerts.notifications.length ? (
              alerts.notifications.map((n) => (
                <article className={n.read ? 'read' : 'unread'} key={n.id}>
                  {n.kind === 'boss' ? (
                    <Flame size={21} />
                  ) : n.kind === 'online' ? (
                    <Trophy size={21} />
                  ) : n.kind === 'quest' ? (
                    <ScrollText size={21} />
                  ) : (
                    <Sparkles size={21} />
                  )}
                  <div>
                    <h3>{n.title}</h3>
                    <p>{n.text}</p>
                    <small>
                      {new Date(n.time).toLocaleString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </small>
                    <button
                      className="text-button"
                      onClick={() => {
                        alerts.markRead();
                        setDialog(null);
                        moveTo(
                          n.kind === 'boss' || n.kind === 'online'
                            ? 'community'
                            : n.kind === 'quest'
                              ? 'quests'
                              : n.kind === 'title'
                                ? 'titles'
                                : 'dashboard',
                        );
                      }}
                    >
                      Xem ngay
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <Empty
                icon={<Bell size={30} />}
                title="Tam giới đang yên bình"
                description="Thông báo sẽ hiện khi có boss, nhiệm vụ hoàn thành hoặc đạo hữu online."
              />
            )}
          </div>
        </Modal>
      )}
      {dialog === 'help' && (
        <Modal
          title="Đạo thư nhập môn"
          subtitle="Tiên lộ ngàn dặm bắt đầu từ một niệm."
          onClose={() => setDialog(null)}
        >
          <div className="help-steps">
            {[
              {
                icon: Wind,
                name: 'Tĩnh tâm tu luyện',
                text: 'Bắt đầu ngồi thiền một lần; mỗi đủ 60 giây mới nhận tu vi và linh khí, không tăng khi nhấn lại. Nhận tối đa 2 giờ khi ngoại tuyến. Thắp hương tăng hiệu suất trong 5 phút.',
              },
              {
                icon: Sparkles,
                name: 'Củng cố đạo cơ',
                text: 'Đủ tu vi, linh khí và linh thạch thì đột phá. Mỗi đại cảnh giới gồm Sơ kỳ, Trung kỳ, Đỉnh phong. Mốc Chân Tiên mở Tiên giới; Chân Thần mở Thần giới.',
              },
              {
                icon: Swords,
                name: 'Khám phá và chiến đấu',
                text: 'Mỗi lượt khám phá tốn 8 thể lực. Chọn công kích, Lưu Vân Quyết (hồi 3 lượt), phòng ngự hoặc dùng đan. Có thể rút lui. Bại trận mất 5% linh thạch.',
              },
              {
                icon: Backpack,
                name: 'Trang bị và luyện chế',
                text: 'Có 7 vị trí trang bị và 9 phẩm. Trang bị từ chiến đấu, chế tạo. Phân giải để nhận tinh hoa, cường hóa đến +10. Luyện đan giúp hồi máu và tăng tu vi.',
              },
              {
                icon: Castle,
                name: 'Nhân duyên và sơn môn',
                text: 'Chọn chủng tộc trong Nhân vật, chỉ chọn một lần. Gia nhập tông môn để nhận bonus. Trò chuyện với NPC và khám phá để tìm nhiệm vụ ẩn.',
              },
              {
                icon: Download,
                name: 'Giữ lại đạo lộ',
                text: 'Tiến trình tự lưu trên thiết bị. Đăng nhập cùng tài khoản để đồng bộ PC, Android và web; xuất bản lưu ở Cài đặt để giữ một bản sao riêng.',
              },
            ].map((step, i) => (
              <div key={step.name}>
                <span>
                  <step.icon size={21} />
                </span>
                <div>
                  <h3>
                    {i + 1}. {step.name}
                  </h3>
                  <p>{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {dialog === 'install' && (
        <Modal
          title="Mang tiên lộ bên mình"
          subtitle="App PC và Android cài riêng, dùng chung đạo lộ với web qua tài khoản."
          onClose={() => setDialog(null)}
        >
          <div className="install-hero">
            <span className="app-icon">
              <Mountain size={46} strokeWidth={1.2} />
            </span>
            <h3>Vân Tiên Ký</h3>
            <p>
              {nativeApp
                ? `Bạn đang chơi app ${desktopApp ? 'PC' : 'Android'}. Đăng nhập để liên kết đạo lộ với web.`
                : 'Tải app PC hoặc APK Android. Chơi ngoại tuyến và đồng bộ với web khi có mạng.'}
            </p>
            {!nativeApp && (
              <a
                className="button primary apk-link"
                href="/downloads/van-tien-ky-pc-windows.zip"
                download
              >
                <Download size={18} />
                Tải app PC (Windows)
              </a>
            )}
            {!nativeApp && (
              <a
                className="button primary apk-link"
                href="/downloads/van-tien-ky-android.apk"
                download
              >
                <Download size={18} />
                Tải app Android (APK)
              </a>
            )}
            <button className="button secondary" onClick={() => setDialog('account')}>
              <MonitorSmartphone size={17} />
              Tài khoản & đồng bộ
            </button>
            {!nativeApp &&
              (installed ? (
                <Tag color="green">
                  <CircleCheck size={14} />
                  Ứng dụng đã được cài
                </Tag>
              ) : installEvent ? (
                <button className="button primary" onClick={installApp}>
                  <Download size={18} />
                  Cài ứng dụng
                </button>
              ) : (
                <Tag>
                  <MonitorSmartphone size={14} />
                  Cài từ menu trình duyệt
                </Tag>
              ))}
          </div>
          <div className="install-instructions">
            <h3>Chơi app PC trên Windows</h3>
            <p>
              Giải nén toàn bộ gói PC, mở <strong>VanTienKy.exe</strong> trong thư mục đã giải nén.
              Game đã có sẵn; mở Tài khoản & đồng bộ để liên kết với web và Android.
            </p>
            <h3>Cài APK trên Android</h3>
            <p>
              Tải tệp APK, mở tệp và cho phép cài ứng dụng từ nguồn bạn vừa tải. Trong app, mở Tài
              khoản & đồng bộ, nhập địa chỉ website game rồi đăng nhập cùng tài khoản trên web.
            </p>
            <h3>Cài thêm bản web trên màn hình chính</h3>
            <p>
              Mở game bằng Chrome hoặc Edge qua HTTPS, chọn menu ⋮ →{' '}
              <strong>Cài đặt ứng dụng</strong> / <strong>Thêm vào màn hình chính</strong>.
            </p>
            <h3>iPhone & iPad</h3>
            <p>
              Mở bằng Safari → nút <strong>Chia sẻ</strong> → <strong>Thêm vào MH chính</strong> →{' '}
              <strong>Thêm</strong>.
            </p>
            <div className="info-note">
              <CircleHelp size={16} />
              <span>
                Bản web có thể cài dạng PWA. App PC chạy bằng EXE và Android chạy bằng APK riêng; cả
                hai đều có game đóng gói sẵn. Đồng bộ tài khoản cần website chạy máy chủ và kết nối
                mạng.
              </span>
            </div>
          </div>
        </Modal>
      )}
      {dialog === 'settings' && (
        <Modal
          title="Cài đặt & bản lưu"
          subtitle={
            cloud.account
              ? `Tài khoản ${cloud.account.username} · ${cloud.label}`
              : 'Tự lưu trên thiết bị. Đăng nhập để đồng bộ PC, Android và web.'
          }
          onClose={() => setDialog(null)}
        >
          <div className="settings-status">
            <span>
              <Check size={19} />
            </span>
            <div>
              <h3>
                {game.storageBlocked || game.saveFailed
                  ? 'Bản lưu cần được xử lý'
                  : 'Tiến trình đang được tự động lưu'}
              </h3>
              <p>
                Phiên bản 1.3 · {s.name} · {realmName(s.stage)}
              </p>
            </div>
          </div>
          <div className="settings-actions">
            <button onClick={appearance.toggle}>
              {appearance.theme === 'dark' ? <Sun size={21} /> : <Moon size={21} />}
              <span>
                <strong>Giao diện {appearance.theme === 'dark' ? 'tối' : 'sáng'}</strong>
                <small>Nhấn để đổi và ghi nhớ trên thiết bị</small>
              </span>
              <ChevronRight size={17} />
            </button>
            <button onClick={() => setDialog('account')}>
              <MonitorSmartphone size={21} />
              <span>
                <strong>Tài khoản & đồng bộ</strong>
                <small>
                  {cloud.account
                    ? cloud.label
                    : 'Liên kết web, PC và app Android bằng một tài khoản'}
                </small>
              </span>
              <ChevronRight size={17} />
            </button>
            <button onClick={exportSave}>
              <Download size={21} />
              <span>
                <strong>{game.storageBlocked ? 'Xuất bản lưu cũ' : 'Xuất bản lưu'}</strong>
                <small>Tải tệp JSON để giữ an toàn hoặc chuyển thiết bị</small>
              </span>
              <ChevronRight size={17} />
            </button>
            <button onClick={() => importInput.current?.click()}>
              <Upload size={21} />
              <span>
                <strong>Nhập bản lưu</strong>
                <small>Khôi phục từ tệp đã xuất · Thay thế tiến trình hiện tại</small>
              </span>
              <ChevronRight size={17} />
            </button>
            <input
              ref={importInput}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const input = e.currentTarget;
                try {
                  if (file.size > 250000) tell('Bản lưu quá lớn.', false);
                  else {
                    const restored = game.importSave(await file.text());
                    if (restored) {
                      setName(restored.name);
                      setRace(restored.race);
                    }
                  }
                } catch {
                  tell('Không thể đọc tệp. Hãy chọn lại một bản lưu JSON.', false);
                } finally {
                  input.value = '';
                }
              }}
            />
            <button onClick={() => setDialog('install')}>
              <MonitorSmartphone size={21} />
              <span>
                <strong>Cài ứng dụng</strong>
                <small>Chơi trên màn hình chính và khi ngoại tuyến</small>
              </span>
              <ChevronRight size={17} />
            </button>
          </div>
          <div className="reset-zone">
            <h3>Bắt đầu đạo lộ mới</h3>
            <p>
              Thao tác này xóa tiến trình hiện tại trên thiết bị. Hãy xuất bản lưu trước khi bắt đầu
              lại.
            </p>
            {confirmReset ? (
              <div className="reset-confirm">
                <strong>Bạn muốn xóa tiến trình và bắt đầu lại?</strong>
                <button
                  className="button danger"
                  onClick={() => {
                    game.reset();
                    setName('Vô Danh');
                    setRace('human');
                    setConfirmReset(false);
                    setDialog(null);
                    moveTo('dashboard');
                  }}
                >
                  Xác nhận bắt đầu lại
                </button>
                <button className="button secondary" onClick={() => setConfirmReset(false)}>
                  Giữ đạo lộ hiện tại
                </button>
              </div>
            ) : (
              <button className="button danger-outline" onClick={() => setConfirmReset(true)}>
                <Trash2 size={16} />
                Bắt đầu lại
              </button>
            )}
          </div>
        </Modal>
      )}
      {npcId &&
        (() => {
          const npc = NPCS.find((n) => n.id === npcId)!;
          return (
            <Modal
              title={npc.name}
              subtitle={`${npc.role} · ${MAPS.find((m) => m.id === npc.mapId)!.name}`}
              onClose={() => setNpcId(null)}
            >
              <div className="npc-dialog">
                <span>{npc.symbol}</span>
                <p>{npc.dialogue}</p>
              </div>
              <div className="npc-trade">
                <h3>Một món quà, một nhân duyên</h3>
                <p>
                  Đổi 1 {ITEMS[npc.gift].name} (đang có {s.inventory[npc.gift] || 0}) để nhận 1{' '}
                  {ITEMS[npc.reward].name}.
                </p>
                <button
                  className="button primary"
                  disabled={!(s.inventory[npc.gift] || 0)}
                  onClick={() => act({ type: 'npc', npcId: npc.id, choice: 'gift' })}
                >
                  <Leaf size={16} />
                  Trao đổi vật phẩm
                </button>
              </div>
            </Modal>
          );
        })()}
      {s.battle && (
        <Modal
          title="Một cuộc chạm trán"
          subtitle={`${s.battle.secretId ? SECRET_AREAS.find((area) => area.id === s.battle!.secretId)!.name : MAPS.find((m) => m.id === s.battle!.mapId)!.name} · ${KIND_LABELS[s.battle.kind]} · Lượt ${s.battle.turn + 1}`}
          wide
        >
          <div className="battle-scene">
            <Landscape terrain={MAPS.find((m) => m.id === s.battle!.mapId)!.terrain} />
            <div className="combatant player">
              <span>{raceInfo.symbol}</span>
              <h3>{s.name}</h3>
              <small>{realmName(s.stage)}</small>
              <Progress value={(s.hp / st.maxHp) * 100} color="green" label="Sinh lực người chơi" />
              <b>
                {fmt(s.hp)} / {fmt(st.maxHp)}
              </b>
            </div>
            <span className="versus">VS</span>
            <div className="combatant enemy">
              <span>妖</span>
              <h3>{s.battle.name}</h3>
              <small>
                {s.battle.title} · {KIND_LABELS[s.battle.kind]}
                {s.battle.enraged ? ' · Cuồng nộ +30% công kích' : ''}
              </small>
              <Progress
                value={(s.battle.hp / s.battle.maxHp) * 100}
                color="red"
                label="Sinh lực yêu quái"
              />
              <b>
                {fmt(s.battle.hp)} / {fmt(s.battle.maxHp)}
              </b>
            </div>
          </div>
          <div className="battle-logs" aria-live="polite">
            {s.battle.logs.map((log, i) => (
              <p key={`${s.battle!.turn}-${i}`}>
                <ChevronRight size={12} />
                {log}
              </p>
            ))}
          </div>
          <div className="battle-actions">
            <button
              className="button primary"
              onClick={() => act({ type: 'fight', move: 'attack' })}
            >
              <Swords size={18} />
              Công kích
            </button>
            <button
              className="button gold-button"
              disabled={s.battle.skillCooldown > 0}
              onClick={() => act({ type: 'fight', move: 'skill' })}
            >
              <Wind size={18} />
              Lưu Vân Quyết
              <small>
                {s.battle.skillCooldown ? `Hồi ${s.battle.skillCooldown} lượt` : 'Sát thương ×2,2'}
              </small>
            </button>
            <button
              className="button secondary"
              onClick={() => act({ type: 'fight', move: 'guard' })}
            >
              <Shield size={17} />
              Phòng ngự
            </button>
            <button
              className="button secondary"
              disabled={!(s.inventory.pill || 0)}
              onClick={() => act({ type: 'fight', move: 'pill' })}
            >
              <FlaskConical size={17} />
              Hồi Xuân Đan<small>×{s.inventory.pill || 0}</small>
            </button>
          </div>
          <div className="battle-footer">
            <span>
              <CircleHelp size={14} />
              Mỗi hành động là một lượt; yêu quái sẽ phản công.
            </span>
            <button className="text-button" onClick={() => act({ type: 'fight', move: 'flee' })}>
              <Footprints size={15} />
              Rút lui
            </button>
          </div>
        </Modal>
      )}
      {bestiaryMap && (
        <Modal
          title={`Yêu quái · ${MAPS.find((map) => map.id === bestiaryMap)!.name}`}
          subtitle="Yêu quái bản địa và những kẻ đầu đàn"
          wide
          onClose={() => setBestiaryMap(null)}
        >
          <Bestiary mapId={bestiaryMap} state={s} />
        </Modal>
      )}
    </div>
  );
}
