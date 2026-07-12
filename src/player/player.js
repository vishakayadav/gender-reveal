// src/player/player.js
import { createApi } from '../lib/api.js';
import { BACKEND_URL } from '../config.js';
import { PUZZLES } from '../data/puzzles.js';
import { checkAnswer } from '../lib/puzzles.js';
import { isRevealUnlocked } from '../lib/reveal.js';

export async function initPlayer({ root, api, gameId, puzzles }) {
  const state = { name: '', guess: '', idx: 0, code: '', game: null };
  const P = puzzles || PUZZLES;

  function el(html) { const d = document.createElement('div'); d.innerHTML = html; return d; }
  function set(node) { root.innerHTML = ''; root.appendChild(node); }

  state.game = await api.getGame(gameId);

  const controller = { state, goGuess, submitGuess, answerCurrent, goWaiting, renderReveal };

  function renderWelcome() {
    const opts = state.game.players.map((n) => `<option value="${n}"></option>`).join('');
    const node = el(`<div class="card">
      <h1 class="title-grad">Vishaka's Baby Gender Reveal Game 🎉</h1>
      <p class="lead">Let's start !!!</p>
      <input id="name" list="names" placeholder="Start typing your name" autocomplete="off" />
      <datalist id="names">${opts}</datalist>
      <button class="btn" id="start">Start</button>
    </div>`);
    node.querySelector('#start').onclick = async () => {
      const val = node.querySelector('#name').value;
      if (!state.game.players.some((n) => n === val)) { alert('Please pick your name from the list.'); return; }
      state.name = val;
      await goGuess();
    };
    set(node);
  }

  async function goGuess() {
    const node = el(`<div class="card">
      <div class="rhyme title-grad">Twinkle twinkle little star,</div>
      <div class="rhyme">how we wonder what you are 💫</div>
      <h2 style="margin-top:14px">Hi ${state.name}! What's your guess?</h2>
      <button class="btn" id="boy">Boy 💙</button>
      <button class="btn" id="girl">Girl 💖</button>
    </div>`);
    node.querySelector('#boy').onclick = () => submitGuess('boy');
    node.querySelector('#girl').onclick = () => submitGuess('girl');
    set(node);
  }

  async function submitGuess(guess) {
    state.guess = guess;
    await api.submitGuess(gameId, state.name, guess);
    state.idx = 0;
    renderPuzzle();
  }

  function renderPuzzle() {
    const p = P[state.idx];
    const node = el(`<div class="card">
      <div class="progress">Puzzle ${state.idx + 1} of ${P.length}</div>
      <p>${p.riddle}</p>
      <input id="ans" placeholder="Your answer" autocomplete="off" />
      <button class="btn" id="submit">Submit</button>
      <button class="btn" id="hint" style="background:#bbb">Hint</button>
      <p id="fb"></p>
    </div>`);
    node.querySelector('#hint').onclick = () => { node.querySelector('#fb').textContent = 'Hint: ' + p.hint; };
    node.querySelector('#submit').onclick = () => answerCurrent(node.querySelector('#ans').value, node);
    set(node);
  }

  async function answerCurrent(value, node) {
    const p = P[state.idx];
    if (!checkAnswer(p, value)) {
      if (node) node.querySelector('#fb').textContent = 'Not quite — try again!';
      return;
    }
    if (state.idx < P.length - 1) { state.idx++; renderPuzzle(); return; }
    const res = await api.submitCode(gameId, state.name);
    state.code = res.code;
    renderCode();
  }

  function renderCode() {
    const node = el(`<div class="card">
      <h2>You did it, ${state.name}! 🎉</h2>
      <p>Your personal code:</p>
      <div class="big">${state.code}</div>
      <button class="btn" id="next">Continue</button>
    </div>`);
    node.querySelector('#next').onclick = () => goWaiting();
    set(node);
  }

  async function goWaiting() {
    async function tick() {
      const g = await api.getGame(gameId);
      state.game = g;
      if (isRevealUnlocked({ codesIn: g.codesIn, total: g.total, revealOpen: g.revealOpen })) {
        const r = await api.getReveal(gameId, state.name);
        if (!r.locked) { renderReveal(r.reveal); return; }
      }
      const node = el(`<div class="card">
        <h2>Almost there!</h2>
        <div class="progress">${g.codesIn} of ${g.total} codes in</div>
        <p>${g.revealOpen ? 'Waiting for everyone to finish…' : 'Waiting for the host to start the reveal 🔒'}</p>
      </div>`);
      set(node);
      controller._timer = setTimeout(tick, 4000);
    }
    await tick();
  }

  function renderReveal(reveal) {
    // Full-screen sequence (countdown → balloons → confetti → message) mounts
    // over everything, so clear the waiting card behind it.
    root.innerHTML = '';
    import('../ui/reveal-anim.js').then((m) => m.playReveal(reveal)).catch(() => {});
  }

  renderWelcome();
  return controller;
}

// Auto-boot when loaded in the browser (skipped in tests that import initPlayer directly).
if (typeof window !== 'undefined' && document.getElementById('app') && !window.__PLAYER_TEST__) {
  const gameId = new URLSearchParams(location.search).get('game');
  const root = document.getElementById('app');
  if (!gameId) { root.innerHTML = '<div class="card">Missing game link.</div>'; }
  else { initPlayer({ root, api: createApi(BACKEND_URL), gameId }); }
}
