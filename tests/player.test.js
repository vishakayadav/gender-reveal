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

  it('waiting room shows progress and reveal stays locked', async () => {
    const root = document.createElement('div');
    const api = stubApi();
    const c = await initPlayer({ root, api, gameId: 'g1', puzzles });
    await c.goWaiting();
    expect(root.textContent).toContain('of 2');
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
