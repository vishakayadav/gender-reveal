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

  const controller = { state, begin, goGuess, submitGuess, answerCurrent, renderFinish, goWaiting, renderReveal };

  function sameName(a, b) {
    return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  }

  // Route a chosen player: if they already finished, skip the game and go
  // straight to the waiting room (which itself flips to the reveal once the
  // host opens it and everyone is done); otherwise start the guess flow.
  async function begin(name) {
    state.name = name;
    const finished = state.game.finished || [];
    if (finished.some((n) => sameName(n, name))) {
      await goWaiting();
    } else {
      await goGuess();
    }
  }

  function renderWelcome() {
    const opts = state.game.players.map((n) => `<option value="${n}"></option>`).join('');
    const gname = (state.game.gameName || '').trim();
    // Show the game name, appending "Gender Reveal" only if it isn't already in there.
    const title = !gname ? 'Gender Reveal'
      : /gender\s*reveal/i.test(gname) ? gname
      : `${gname} Gender Reveal`;
    const node = el(`<div class="card">
      <h1 class="title-grad">${title} 🎉</h1>
      <p class="lead">Let's start !!!</p>
      <input id="name" list="names" placeholder="Start typing your name" autocomplete="off" />
      <datalist id="names">${opts}</datalist>
      <button class="btn" id="start">Start</button>
    </div>`);
    node.querySelector('#start').onclick = async () => {
      const val = node.querySelector('#name').value;
      if (!state.game.players.some((n) => n === val)) { alert('Please pick your name from the list.'); return; }
      await begin(val);
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
    await renderFinish(res);
  }

  async function renderFinish(res) {
    // No final question configured for this game → no code; go straight to waiting.
    if (!res || !res.code) { await goWaiting(); return; }
    state.code = res.code;
    const hasKey = !!(state.game && state.game.hasFinalKey);
    const at = res.position != null ? `You completed the riddles at #${res.position}` : '';
    const gate = hasKey
      ? `<hr />
         <p>Join everyone's decrypted parts (in finish order) to read the final question, then:</p>
         <label>Enter the final key for reveal</label>
         <input id="key" placeholder="Your answer" autocomplete="off" />
         <button class="btn" id="submitKey">Unlock 🔑</button>
         <p id="keyfb"></p>`
      : `<button class="btn" id="next">Continue</button>`;
    const node = el(`<div class="card">
      <h2>Congrats ${state.name} 🎉</h2>
      ${at ? `<p>${at}</p>` : ''}
      <p>Your secret code:</p>
      <div class="code-box" id="code">${state.code}</div>
      <p class="foot"><a href="https://www.base64decode.org/" target="_blank" rel="noopener">Decrypt your code →</a></p>
      ${gate}
    </div>`);
    if (hasKey) {
      node.querySelector('#submitKey').onclick = async () => {
        const r = await api.checkFinalKey(gameId, node.querySelector('#key').value);
        if (r && r.ok) { await goWaiting(); }
        else { node.querySelector('#keyfb').textContent = 'Not quite — try again.'; }
      };
    } else {
      node.querySelector('#next').onclick = () => goWaiting();
    }
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
      const remaining = g.total - g.codesIn;
      // While anyone is still finishing, wait on the players — not the host.
      // Only once everyone's done do we wait on the host to open the reveal.
      const waitMsg = remaining > 0
        ? `Waiting for the remaining ${remaining} player${remaining === 1 ? '' : 's'} to finish…`
        : 'Waiting for the host to start the reveal 🔒';
      const node = el(`<div class="card">
        <h2>Almost there!</h2>
        <div class="progress">${g.codesIn} of ${g.total} finished</div>
        <p>${waitMsg}</p>
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
