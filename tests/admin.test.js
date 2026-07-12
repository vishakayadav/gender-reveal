// tests/admin.test.js
import { describe, it, expect, vi } from 'vitest';
import { initAdmin } from '../src/admin/admin.js';

function stubApi(overrides = {}) {
  return {
    createGame: vi.fn(async () => ({ gameId: 'abcd1234' })),
    setRevealOpen: vi.fn(async () => ({ ok: true })),
    ...overrides,
  };
}

describe('admin flow', () => {
  it('buildPayload parses players and reveal content', () => {
    const root = document.createElement('div');
    const c = initAdmin({ root, api: stubApi(), origin: 'https://site' });
    const payload = c.buildPayload({
      gameName: 'Baby R', playersText: 'Priya\nArjun\n', revealOpen: false,
      gender: 'girl',
    });
    expect(payload.players).toEqual(['Priya', 'Arjun']);
    expect(payload.revealContent).toEqual({ gender: 'girl' });
    expect(payload.revealOpen).toBe(false);
  });

  it('create calls api and produces a player link', async () => {
    const root = document.createElement('div');
    const api = stubApi();
    const c = initAdmin({ root, api, origin: 'https://site' });
    c.setPassword('pw');
    const link = await c.create({ gameName: 'B', playersText: 'A\nB', revealOpen: true, gender: 'boy', message: '' });
    expect(api.createGame).toHaveBeenCalled();
    expect(link).toBe('https://site/play.html?game=abcd1234');
  });

  it('extractGameId reads ?game= from a link and passes through a raw id', () => {
    const c = initAdmin({ root: document.createElement('div'), api: stubApi(), origin: 'https://site' });
    expect(c.extractGameId('https://site/play.html?game=abcd1234')).toBe('abcd1234');
    expect(c.extractGameId('  rawid99 ')).toBe('rawid99');
  });

  it('setReveal calls api.setRevealOpen with password and flag', async () => {
    const api = stubApi();
    const c = initAdmin({ root: document.createElement('div'), api, origin: 'https://site' });
    c.setPassword('pw');
    await c.setReveal('g9', true);
    expect(api.setRevealOpen).toHaveBeenCalledWith('pw', 'g9', true);
  });
});
