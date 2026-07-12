// tests/api.test.js
import { describe, it, expect, vi } from 'vitest';
import { createApi } from '../src/lib/api.js';

function fakeFetch(captured) {
  return vi.fn(async (url, opts) => {
    captured.url = url;
    captured.opts = opts;
    return { json: async () => ({ ok: true, echo: JSON.parse(opts.body) }) };
  });
}

describe('createApi', () => {
  it('POSTs text/plain JSON with the right action', async () => {
    const captured = {};
    const api = createApi('https://x/exec', fakeFetch(captured));
    const res = await api.submitGuess('g1', 'Priya', 'girl');
    expect(captured.opts.method).toBe('POST');
    expect(captured.opts.headers['Content-Type']).toBe('text/plain;charset=utf-8');
    expect(res.echo).toEqual({ action: 'submitGuess', gameId: 'g1', name: 'Priya', guess: 'girl' });
  });

  it('createGame includes adminPw and payload', async () => {
    const captured = {};
    const api = createApi('https://x/exec', fakeFetch(captured));
    await api.createGame('pw', { gameName: 'Baby', players: ['A', 'B'], revealOpen: false, revealContent: { gender: 'girl' } });
    expect(captured.opts.body).toContain('"action":"createGame"');
    expect(captured.opts.body).toContain('"adminPw":"pw"');
  });
});
