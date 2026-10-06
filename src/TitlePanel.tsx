import { useState } from 'react';
import { Check, Crown, Eye, LockKeyhole, Search, Sparkles, X } from 'lucide-react';
import {
  TITLES,
  TITLE_RARITIES,
  TITLE_EFFECTS,
  equippedTitle,
  titleBonusText,
  titleUnlocked,
  type CultivationTitle,
  type TitleRarity,
} from './game/titles';
import type { Action, GameState } from './game/types';
import './titles.css';

export function TitleBadge({
  title,
  animated = true,
  compact = false,
}: {
  title?: CultivationTitle;
  animated?: boolean;
  compact?: boolean;
}) {
  if (!title) return null;
  return (
    <span
      className={`title-badge effect-${title.effect} rarity-${title.rarity} ${animated ? 'title-animated' : ''} ${compact ? 'title-compact' : ''}`}
    >
      <span className="title-sigil" aria-hidden="true">
        {title.symbol}
      </span>
      <span className="title-name">{title.name}</span>
      <span className="title-particles" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <i key={i} style={{ '--particle': i } as React.CSSProperties} />
        ))}
      </span>
    </span>
  );
}

export function TitlePanel({ state: s, act }: { state: GameState; act: (a: Action) => boolean }) {
  const [filter, setFilter] = useState<'all' | 'owned' | 'locked'>('all');
  const [rarity, setRarity] = useState<TitleRarity | ''>('');
  const [query, setQuery] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const selected = equippedTitle(s);
  const owned = TITLES.filter((t) => titleUnlocked(s, t)).length;
  const visible = TITLES.filter(
    (t) =>
      (!rarity || rarity === t.rarity) &&
      t.name.toLocaleLowerCase('vi-VN').includes(query.toLocaleLowerCase('vi-VN')) &&
      (filter === 'all' || titleUnlocked(s, t) === (filter === 'owned')),
  );
  return (
    <div className="titles-page">
      <section className="panel titles-hero">
        <div className="honor-seal" aria-hidden="true">
          <Crown size={42} />
          <span>封</span>
        </div>
        <div className="titles-intro">
          <span className="eyebrow">PHONG HÀO TRÊN TIÊN LỘ</span>
          <h2>Một danh xưng. Một truyền thuyết.</h2>
          <p>
            50 danh hiệu mở qua cảnh giới và thành tựu. Danh hiệu đã đạt được giữ vĩnh viễn; trang
            bị một danh hiệu để nhận gia trì.
          </p>
          <strong className="title-count">Đã mở {owned}/50 danh hiệu</strong>
        </div>
      </section>
      <section className="panel equipped-honor" aria-label="Danh hiệu đang mang">
        <div>
          <small>DANH HIỆU ĐANG MANG</small>
          {selected ? (
            <>
              <TitleBadge title={selected} animated={s.titles.effects} />
              <p>
                {titleBonusText(selected)} · {TITLE_EFFECTS[selected.effect]}
              </p>
            </>
          ) : (
            <>
              <h3>Đạo hữu chưa xưng danh</h3>
              <p>Chọn một danh hiệu đã mở bên dưới để nhận gia trì và hiệu ứng.</p>
            </>
          )}
        </div>
        <div className="honor-controls">
          <button
            className="button secondary"
            aria-pressed={s.titles.effects}
            onClick={() => act({ type: 'title-effects', enabled: !s.titles.effects })}
          >
            <Sparkles size={16} />
            {s.titles.effects ? 'Tắt hiệu ứng danh hiệu' : 'Bật hiệu ứng danh hiệu'}
          </button>
          {selected && (
            <button className="text-button" onClick={() => act({ type: 'equip-title', id: null })}>
              <X size={14} />
              Gỡ danh hiệu
            </button>
          )}
        </div>
      </section>
      <div className="title-filters">
        <div className="filter-tabs" aria-label="Lọc danh hiệu">
          {(
            [
              ['all', 'Tất cả'],
              ['owned', 'Đã mở'],
              ['locked', 'Chưa mở'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              className={filter === id ? 'active' : ''}
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="title-search">
          <Search size={16} />
          <input
            aria-label="Tìm danh hiệu"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm phong hào…"
          />
        </label>
        <select
          aria-label="Phẩm danh hiệu"
          value={rarity}
          onChange={(e) => setRarity(e.target.value as TitleRarity | '')}
        >
          <option value="">Mọi phẩm</option>
          {Object.entries(TITLE_RARITIES).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="title-grid">
        {visible.map((t) => {
          const unlocked = titleUnlocked(s, t),
            wearing = selected?.id === t.id;
          const progress = Math.min(t.target, t.progress(s));
          return (
            <article
              key={t.id}
              className={`panel honor-card ${unlocked ? 'unlocked' : 'locked'} ${wearing ? 'equipped' : ''}`}
              aria-label={t.name}
            >
              <div className={`honor-art effect-${t.effect}`} aria-hidden="true">
                <span>{t.symbol}</span>
                <i />
                <i />
              </div>
              <div className="honor-card-body">
                <span className={`title-grade rarity-${t.rarity}`}>
                  {TITLE_RARITIES[t.rarity]}{' '}
                  {wearing ? '· Đang mang' : unlocked ? '· Đã mở' : '· Chưa mở'}
                </span>
                <h3>{t.name}</h3>
                <TitleBadge
                  title={t}
                  animated={s.titles.effects && (wearing || preview === t.id)}
                />
                <p className="honor-bonus">
                  <Sparkles size={14} />
                  {titleBonusText(t)}
                </p>
                <small className="honor-effect">{TITLE_EFFECTS[t.effect]}</small>
                <div className="honor-requirement">
                  <span>
                    {unlocked ? <Check size={14} /> : <LockKeyhole size={14} />}
                    {t.requirement}
                  </span>
                  <div
                    className="honor-progress"
                    role="progressbar"
                    aria-label={`Tiến độ ${t.name}`}
                    aria-valuemin={0}
                    aria-valuemax={t.target}
                    aria-valuenow={unlocked ? t.target : Math.floor(progress)}
                  >
                    <i style={{ width: `${unlocked ? 100 : (progress / t.target) * 100}%` }} />
                  </div>
                  <small>
                    {unlocked
                      ? 'Phong hào đã khắc vào đạo thư'
                      : `${Math.floor(progress).toLocaleString('vi-VN')} / ${t.target.toLocaleString('vi-VN')}`}
                  </small>
                </div>
                <div className="honor-card-actions">
                  <button
                    className={`button ${wearing ? 'secondary' : 'primary'}`}
                    disabled={!unlocked || wearing || !!s.battle}
                    onClick={() => act({ type: 'equip-title', id: t.id })}
                  >
                    {wearing ? <Check size={15} /> : <Crown size={15} />}
                    {wearing ? 'Đang mang' : unlocked ? 'Trang bị danh hiệu' : 'Chưa mở khóa'}
                  </button>
                  <button
                    className="honor-preview"
                    aria-label={`Xem hiệu ứng ${t.name}`}
                    aria-pressed={preview === t.id}
                    disabled={!s.titles.effects}
                    onClick={() => setPreview(preview === t.id ? null : t.id)}
                  >
                    <Eye size={17} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!visible.length && (
        <div className="panel title-empty">Chưa có danh hiệu khớp bộ lọc này.</div>
      )}
      <p className="honor-footnote">
        Gia trì của các danh hiệu không cộng dồn. Tắt chuyển động vẫn giữ gia trì; hiệu ứng tự giảm
        khi thiết bị bật chế độ giảm chuyển động.
      </p>
    </div>
  );
}
