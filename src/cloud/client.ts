import { Capacitor } from '@capacitor/core';
import { decodeSave } from '../game/storage';
import type { GameState } from '../game/types';
import { initialState } from '../game/engine';

export const mobileApp = Capacitor.isNativePlatform();
export const androidApp = mobileApp && Capacitor.getPlatform() === 'android';
export const iosApp = mobileApp && Capacitor.getPlatform() === 'ios';
export const desktopApp = typeof window !== 'undefined' && window.vanTienDesktop?.platform === 'pc';
export const nativeApp = mobileApp || desktopApp;
export const ACCOUNT_KEY = 'van-tien-ky.account.v1';
export const SERVER_KEY = 'van-tien-ky.server.v1';
export interface CloudSave {
  revision: number;
  state: GameState | null;
  updatedAt: number;
}
export interface Account {
  token: string;
  username: string;
  server: string;
  revision: number;
  baseline: string | null;
  admin?: boolean;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public cloud?: CloudSave,
  ) {
    super(message);
  }
}
export function validateServer(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('Hãy nhập địa chỉ web đầy đủ, ví dụ https://ten-game.vn.');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (
    (url.protocol !== 'https:' && !(url.protocol === 'http:' && local && !mobileApp)) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new Error(
      'Dùng địa chỉ HTTPS của website game, không có đường dẫn, mật khẩu hay tham số.',
    );
  }
  return url.origin;
}
export function defaultServer() {
  try {
    return validateServer(
      localStorage.getItem(SERVER_KEY) ||
        import.meta.env.VITE_API_URL ||
        (nativeApp ? '' : window.location.origin),
    );
  } catch {
    return nativeApp ? '' : window.location.origin;
  }
}
export function fingerprint(state: GameState) {
  // Passive regeneration must not create conflicts merely because two devices are idle.
  const { lastTick: _time, hp: _hp, stamina: _stamina, ...progress } = state;
  return JSON.stringify({ ...progress, training: { active: state.training.active } });
}
export function migrateBaseline(mark: string | null): string | null {
  if (!mark) return mark;
  try {
    const v = JSON.parse(mark);
    if (v.version !== 1) return mark;
    const defaults = initialState();
    const state = {
      ...defaults,
      ...v,
      training: {
        ...defaults.training,
        ...v.training,
        totalSeconds: (v.metrics?.meditations || 0) * 60,
      },
    };
    return fingerprint(decodeSave(JSON.stringify(state)));
  } catch {
    return mark;
  }
}
export function readAccount(): Account | null {
  try {
    const a = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null');
    if (
      !a ||
      !/^[\w-]{43}$/.test(a.token) ||
      !/^[a-z0-9_]{3,24}$/.test(a.username) ||
      !Number.isSafeInteger(a.revision) ||
      a.revision < 0 ||
      (a.baseline !== null && typeof a.baseline !== 'string')
    )
      return null;
    return { ...a, baseline: migrateBaseline(a.baseline), server: validateServer(a.server) };
  } catch {
    return null;
  }
}
export function parseCloud(value: CloudSave): CloudSave {
  if (
    !value ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0 ||
    !Number.isFinite(value.updatedAt)
  )
    throw new Error('Máy chủ trả về bản lưu không hợp lệ.');
  return { ...value, state: value.state === null ? null : decodeSave(JSON.stringify(value.state)) };
}
export async function api<T>(
  server: string,
  path: string,
  token?: string,
  body?: unknown,
  method = body === undefined ? 'GET' : 'POST',
): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error('Thiết bị đang ngoại tuyến. Tiến trình vẫn được lưu trên thiết bị.');
  }
  const response = await fetch(`${validateServer(server)}/api${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
    cache: 'no-store',
    credentials: 'omit',
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Địa chỉ này chưa chạy máy chủ Vân Tiên Ký. Hãy kiểm tra địa chỉ web.');
  }
  if (!response.ok)
    throw new ApiError(
      data.message || 'Không thể kết nối máy chủ.',
      response.status,
      data.cloud ? parseCloud(data.cloud) : undefined,
    );
  return data as T;
}
