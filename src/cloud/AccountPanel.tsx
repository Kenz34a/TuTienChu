import { useState } from 'react';
import { Cloud, CloudOff, Download, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import { realmName } from '../game/data';
import type { GameState } from '../game/types';
import type { useCloud } from './useCloud';
import { nativeApp } from './client';

type CloudController = ReturnType<typeof useCloud>;
export function AccountPanel({ cloud, state }: { cloud: CloudController; state: GameState }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState(cloud.server);
  return (
    <div className="account-panel">
      <div className="cloud-summary">
        <span className="cloud-emblem">
          {cloud.status === 'offline' ? <CloudOff size={30} /> : <Cloud size={30} />}
        </span>
        <div>
          <h3>{cloud.account ? cloud.account.username : 'Một đạo lộ, mọi nơi chơi'}</h3>
          <p role="status">{cloud.label}</p>
        </div>
      </div>
      <p>
        Đăng nhập cùng tài khoản trên PC, Android và web để dùng chung nhân vật, trang bị, nhiệm vụ
        và tiến độ tam giới.
      </p>
      {cloud.error && (
        <div className="account-error" role="alert">
          {cloud.error}
        </div>
      )}
      {cloud.conflict && (
        <div className="cloud-conflict">
          <h3>Chọn đạo lộ muốn tiếp tục</h3>
          <p>
            Hai nơi đang có bản lưu khác nhau. Hãy xuất bản lưu thiết bị ở Cài đặt nếu muốn giữ cả
            hai trước khi chọn.
          </p>
          <div className="save-choices">
            <button disabled={cloud.working} onClick={() => void cloud.choose('cloud')}>
              <Cloud size={22} />
              <strong>Dùng bản trên tài khoản</strong>
              <span>
                {cloud.conflict.state?.name} ·{' '}
                {cloud.conflict.state && realmName(cloud.conflict.state.stage)}
              </span>
              <small>
                {cloud.conflict.state?.metrics.meditations} phút thiền · phiên bản{' '}
                {cloud.conflict.revision}
              </small>
              <small>Thay thế tiến trình trên thiết bị này</small>
            </button>
            <button disabled={cloud.working} onClick={() => void cloud.choose('device')}>
              <ShieldCheck size={22} />
              <strong>Dùng bản trên thiết bị</strong>
              <span>
                {state.name} · {realmName(state.stage)}
              </span>
              <small>{state.metrics.meditations} phút thiền</small>
              <small>Ghi tiến trình này lên tài khoản</small>
            </button>
          </div>
        </div>
      )}
      {cloud.account ? (
        <>
          <div className="account-server">
            <small>Máy chủ liên kết</small>
            <strong>{cloud.account.server}</strong>
          </div>
          <div className="account-buttons">
            {cloud.account.admin && !nativeApp && (
              <a className="button secondary" href="/admin">
                Quản trị máy chủ
              </a>
            )}
            <button
              className="button primary"
              disabled={cloud.working || Boolean(cloud.conflict)}
              onClick={() => void cloud.sync()}
            >
              <RefreshCw size={16} />
              Đồng bộ ngay
            </button>
            <button
              className="button secondary"
              disabled={cloud.working}
              onClick={() => void cloud.logout()}
            >
              <LogOut size={16} />
              Đăng xuất
            </button>
          </div>
          <p className="muted">
            Tiến trình vẫn được giữ trên thiết bị khi đăng xuất. Phiên đăng nhập có hiệu lực 30
            ngày. Khi mất mạng, game tiếp tục lưu cục bộ và thử đồng bộ lại.
          </p>
        </>
      ) : (
        <>
          <div className="account-tabs">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => setMode('login')}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className={mode === 'register' ? 'active' : ''}
              onClick={() => setMode('register')}
            >
              Tạo tài khoản
            </button>
          </div>
          <form
            className="account-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await cloud.authenticate(mode, username, password, address)) setPassword('');
            }}
          >
            {nativeApp ? (
              <label>
                Địa chỉ web của game
                <input
                  type="url"
                  aria-label="Địa chỉ web của game"
                  autoCapitalize="none"
                  placeholder="https://ten-game.vn"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  required
                />
                <small>
                  Dùng website đã chạy máy chủ Vân Tiên Ký. Không nhập địa chỉ tệp HTML.
                </small>
              </label>
            ) : (
              <div className="account-server">
                <small>Web và app cùng kết nối</small>
                <strong>{address}</strong>
              </div>
            )}
            <label>
              Tên tài khoản
              <input
                name="username"
                aria-label="Tên tài khoản"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                minLength={3}
                maxLength={24}
                pattern="[a-zA-Z0-9_]+"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <small>3–24 chữ không dấu, số hoặc dấu gạch dưới.</small>
            </label>
            <label>
              Mật khẩu
              <input
                type="password"
                name="password"
                aria-label="Mật khẩu"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                minLength={10}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <small>Ít nhất 10 ký tự. Không dùng lại mật khẩu của dịch vụ khác.</small>
            </label>
            <button className="button primary" type="submit" disabled={cloud.working}>
              {cloud.working
                ? 'Đang kết nối…'
                : mode === 'register'
                  ? 'Tạo tài khoản & lưu đạo lộ'
                  : 'Đăng nhập tài khoản'}
            </button>
          </form>
          <p className="muted">
            Bạn vẫn có thể chơi ngoại tuyến khi chưa có tài khoản. Tài khoản mới sẽ lưu đạo lộ hiện
            tại; tài khoản đã có nhân vật sẽ cho bạn chọn bản lưu.
          </p>
        </>
      )}
      {!nativeApp && (
        <a
          className="button secondary apk-link"
          href="/downloads/van-tien-ky-pc-windows.zip"
          download
        >
          <Download size={17} />
          Tải app PC (Windows)
        </a>
      )}
      {!nativeApp && (
        <a className="button secondary apk-link" href="/downloads/van-tien-ky-android.apk" download>
          <Download size={17} />
          Tải app Android (APK)
        </a>
      )}
    </div>
  );
}
