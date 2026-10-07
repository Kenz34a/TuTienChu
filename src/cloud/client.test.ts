import { describe, expect, it, vi } from 'vitest';
import { api, fingerprint, migrateBaseline, parseCloud, validateServer } from './client';
import { initialState } from '../game/engine';
import { decodeSave } from '../game/storage';
import type { GameState } from '../game/types';

describe('cloud save metadata', () => {
  it('migrates the sync baseline with the legacy character so an idle account remains clean', () => {
    const old = { ...initialState(), version: 1, stage: 6 };
    old.metrics.meditations = 10;
    old.training.totalSeconds = 600;
    const baseline = fingerprint(old as unknown as GameState);
    const migrated = fingerprint(decodeSave(JSON.stringify(old)));
    expect(migrateBaseline(baseline)).toBe(migrated);
    expect(migrateBaseline(migrated)).toBe(migrated);
    expect(migrateBaseline(null)).toBeNull();
    expect(migrateBaseline('broken baseline')).toBe('broken baseline');
  });
  it('adds the new adventure baseline to a version-two account without creating a false conflict', () => {
    const old: any = initialState();
    delete old.adventure;
    old.training.totalSeconds = 600;
    old.metrics.meditations = 10;
    expect(migrateBaseline(fingerprint(old))).toBe(fingerprint(decodeSave(JSON.stringify(old))));
  });
  it('keeps offline writes on the device without attempting a network request', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const network = vi.spyOn(globalThis, 'fetch');
    try {
      await expect(api('https://game.example', '/save')).rejects.toThrow('ngoại tuyến');
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
      vi.unstubAllGlobals();
    }
  });
  it('ignores passive recovery but detects gameplay and battle changes', () => {
    const state = initialState(),
      recovered = {
        ...state,
        hp: state.hp + 1,
        stamina: state.stamina + 1,
        lastTick: state.lastTick + 30000,
      };
    expect(fingerprint(recovered)).toBe(fingerprint(state));
    expect(fingerprint({ ...state, xp: state.xp + 1 })).not.toBe(fingerprint(state));
    expect(fingerprint({ ...state, inventory: { ...state.inventory, pill: 2 } })).not.toBe(
      fingerprint(state),
    );
    expect(fingerprint({ ...state, metrics: { ...state.metrics, meditations: 1 } })).not.toBe(
      fingerprint(state),
    );
  });
  it('requires a clean HTTPS server origin, permitting local browser development', () => {
    expect(validateServer(' https://game.example/ ')).toBe('https://game.example');
    expect(validateServer('http://127.0.0.1:3000')).toBe('http://127.0.0.1:3000');
    for (const url of [
      'http://game.example',
      'https://user:password@game.example',
      'https://game.example?token=x',
      'https://game.example/app',
      'file:///index.html',
      'javascript:alert(1)',
    ])
      expect(() => validateServer(url)).toThrow();
  });
  it('validates remote save payloads before replacing local state', () => {
    expect(parseCloud({ revision: 0, state: null, updatedAt: 0 }).state).toBeNull();
    expect(
      parseCloud({ revision: 1, state: initialState(), updatedAt: Date.now() }).state?.version,
    ).toBe(2);
    expect(() => parseCloud({ revision: -1, state: initialState(), updatedAt: 0 })).toThrow();
    expect(() =>
      parseCloud({ revision: 1, state: { ...initialState(), stage: 80 }, updatedAt: 0 }),
    ).toThrow();
  });
});
