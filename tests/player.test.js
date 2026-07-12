// tests/player.test.js
import { describe, it, expect, vi } from 'vitest';
import { initPlayer } from '../src/player/player.js';

const puzzles = [{ id: 1, riddle: 'q', answers: ['a'], hint: 'h' }];

function stubApi(overrides = {}) {
  return {
    getGame: vi.fn(async () => ({ gameName: 'B', players: ['Priya', 'Arjun'], revealOpen: false, codesIn: 0, total: 2 })),
    submitGuess: vi.fn(async () => ({ ok: true })),
    submitCode: vi.fn(async () => ({ ok: true, code: 'ABCDEF', codesIn: 1 })),
    getReveal: vi.fn(async () => ({ locked: true })),
    ...overrides,
  };
}

describe('player flow', () => {
  it('welcome lists players and advances to guess', async () => {
    const root = document.createElement('div');
    const api = stubApi();
    const c = await initPlayer({ root, api, gameId: 'g1', puzzles });
    expect(root.querySelectorAll('option').length).toBe(2); // datalist options
    c.state.name = 'Priya';
    await c.goGuess();
    expect(root.textContent).toContain('Boy');
    expect(root.textContent).toContain('Girl');
  });

  it('welcome shows the admin-set game name as the title', async () => {
    const root = document.createElement('div');
    const api = stubApi({
      getGame: vi.fn(async () => ({
        gameName: 'Baby Sharma', players: ['Priya'], revealOpen: false,
        codesIn: 0, total: 1, finished: [],
      })),
    });
    await initPlayer({ root, api, gameId: 'g1', puzzles });
    expect(root.textContent).toContain('Baby Sharma');          // name shown
    expect(root.textContent).toContain('Baby Sharma Gender Reveal'); // "Gender Reveal" appended
  });

  it('does not append "Gender Reveal" when the name already contains it', async () => {
    const root = document.createElement('div');
    const api = stubApi({
      getGame: vi.fn(async () => ({
        gameName: 'Sharma Gender reveal', players: ['Priya'], revealOpen: false,
        codesIn: 0, total: 1, finished: [],
      })),
    });
    await initPlayer({ root, api, gameId: 'g1', puzzles });
    expect(root.textContent).toContain('Sharma Gender reveal');
    expect(root.textContent).not.toMatch(/Gender reveal Gender Reveal/i);
  });

  it('submitting a guess calls api.submitGuess', async () => {
    const root = document.createElement('div');
    const api = stubApi();
    const c = await initPlayer({ root, api, gameId: 'g1', puzzles });
    c.state.name = 'Priya';
    await c.submitGuess('girl');
    expect(api.submitGuess).toHaveBeenCalledWith('g1', 'Priya', 'girl');
  });

  it('correct puzzle answer finishes and shows the code', async () => {
    const root = document.createElement('div');
    const api = stubApi();
    const c = await initPlayer({ root, api, gameId: 'g1', puzzles });
    c.state.name = 'Priya';
    await c.answerCurrent('a'); // only one puzzle -> finishes
    expect(api.submitCode).toHaveBeenCalledWith('g1', 'Priya');
    expect(root.textContent).toContain('ABCDEF');
  });

  it('no final question: last riddle goes straight to the waiting room, no code', async () => {
    const root = document.createElement('div');
    const api = stubApi({
      getGame: vi.fn(async () => ({ gameName: 'B', players: ['Priya', 'Arjun'], revealOpen: false, codesIn: 0, total: 2, finished: [] })),
      submitCode: vi.fn(async () => ({ ok: true, codesIn: 1, total: 2 })), // no code
    });
    const c = await initPlayer({ root, api, gameId: 'g1', puzzles });
    c.state.name = 'Priya';
    await c.answerCurrent('a');
    expect(root.textContent).toContain('of 2');       // waiting room
    expect(root.querySelector('.code-box')).toBeNull(); // no code shown
    clearTimeout(c._timer);
  });

  it('final question, no answers: shows finish position, code and decrypt link', async () => {
    const root = document.createElement('div');
    const api = stubApi({
      getGame: vi.fn(async () => ({ gameName: 'B', players: ['Priya', 'Arjun'], revealOpen: false, codesIn: 0, total: 2, finished: [], hasFinalKey: false })),
      submitCode: vi.fn(async () => ({ ok: true, code: 'dGhlIGNhcGl0YWw=', position: 1, total: 2 })),
    });
    const c = await initPlayer({ root, api, gameId: 'g1', puzzles });
    c.state.name = 'Priya';
    await c.answerCurrent('a');
    expect(root.textContent).toContain('completed the riddles at #1');
    expect(root.textContent).toContain('dGhlIGNhcGl0YWw=');
    expect(root.querySelector('a').href).toContain('base64decode.org');
    expect(root.querySelector('#key')).toBeNull();
  });

  it('final question + answers: correct key advances, wrong key shows error', async () => {
    const root = document.createElement('div');
    const api = stubApi({
      getGame: vi.fn(async () => ({ gameName: 'B', players: ['Priya', 'Arjun'], revealOpen: false, codesIn: 1, total: 2, finished: [], hasFinalKey: true })),
      submitCode: vi.fn(async () => ({ ok: true, code: 'Ym95', position: 2, total: 2 })),
      checkFinalKey: vi.fn(async (g, key) => ({ ok: String(key).trim().toLowerCase() === 'boy' })),
    });
    const c = await initPlayer({ root, api, gameId: 'g1', puzzles });
    c.state.name = 'Priya';
    await c.answerCurrent('a');
    expect(root.querySelector('#key')).not.toBeNull();
    root.querySelector('#key').value = 'girl';
    await root.querySelector('#submitKey').onclick();
    expect(root.textContent).toContain('Not quite');
    root.querySelector('#key').value = 'Boy';
    await root.querySelector('#submitKey').onclick();
    expect(root.textContent).toContain('of 2');       // waiting room
    clearTimeout(c._timer);
  });

  it('waiting room: while players remain, waits on players (not the host)', async () => {
    const root = document.createElement('div');
    const api = stubApi(); // codesIn 0, total 2, revealOpen false
    const c = await initPlayer({ root, api, gameId: 'g1', puzzles });
    await c.goWaiting();
    expect(root.textContent).toContain('0 of 2 finished');
    expect(root.textContent).toContain('remaining 2 players');
    expect(root.textContent).not.toContain('host');
    clearTimeout(c._timer);
  });

  it('waiting room: everyone done but reveal closed → waits on the host', async () => {
    const root = document.createElement('div');
    const api = stubApi({
      getGame: vi.fn(async () => ({ gameName: 'B', players: ['Priya', 'Arjun'], revealOpen: false, codesIn: 2, total: 2, finished: ['Priya', 'Arjun'] })),
    });
    const c = await initPlayer({ root, api, gameId: 'g1', puzzles });
    await c.goWaiting();
    expect(root.textContent).toContain('host');
    clearTimeout(c._timer);
  });

  it('a finished player skips the game and goes straight to the waiting room', async () => {
    const root = document.createElement('div');
    const api = stubApi({
      getGame: vi.fn(async () => ({
        gameName: 'B', players: ['Priya', 'Arjun'], revealOpen: false,
        codesIn: 1, total: 2, finished: ['Priya'],
      })),
    });
    const c = await initPlayer({ root, api, gameId: 'g1', puzzles });
    await c.begin('Priya');
    expect(root.textContent).toContain('of 2');        // waiting room, not the guess screen
    expect(api.submitGuess).not.toHaveBeenCalled();     // did not restart the game
    clearTimeout(c._timer);
  });

  it('a not-yet-finished player starts the guess flow', async () => {
    const root = document.createElement('div');
    const api = stubApi({
      getGame: vi.fn(async () => ({
        gameName: 'B', players: ['Priya', 'Arjun'], revealOpen: false,
        codesIn: 1, total: 2, finished: ['Arjun'],
      })),
    });
    const c = await initPlayer({ root, api, gameId: 'g1', puzzles });
    await c.begin('Priya');
    expect(root.textContent).toContain('guess');        // guess screen
  });
});
