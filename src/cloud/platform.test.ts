import { afterEach, expect, it, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

it.each(['ios', 'android'])(
  'treats %s as a bundled mobile app with an explicit HTTPS server',
  async (platform) => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.spyOn(Capacitor, 'getPlatform').mockReturnValue(platform);
    vi.stubGlobal('window', { location: { origin: 'capacitor://localhost' } });
    vi.stubGlobal('localStorage', { getItem: () => null });
    vi.resetModules();
    const client = await import('./client');
    expect(client.mobileApp).toBe(true);
    expect(client.nativeApp).toBe(true);
    expect(client.iosApp).toBe(platform === 'ios');
    expect(client.androidApp).toBe(platform === 'android');
    expect(client.defaultServer()).toBe('');
    expect(() => client.validateServer('http://localhost:3000')).toThrow('HTTPS');
    expect(client.validateServer('https://game.onrender.com')).toBe('https://game.onrender.com');
  },
);
