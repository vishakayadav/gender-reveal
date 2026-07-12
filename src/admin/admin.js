// src/admin/admin.js
import { createApi } from '../lib/api.js';
import { BACKEND_URL } from '../config.js';

export function initAdmin({ root, api, origin }) {
  const state = { pw: '', lastGameId: '' };
  function el(html) { const d = document.createElement('div'); d.innerHTML = html; return d; }
  function set(node) { root.innerHTML = ''; root.appendChild(node); }

  function setPassword(pw) { state.pw = pw; }

  function extractGameId(input) {
    const s = String(input).trim();
    try {
      const u = new URL(s);
      const g = u.searchParams.get('game');
      if (g) return g;
    } catch (_) { /* not a URL */ }
    return s;
  }

  function buildPayload(form) {
    const players = String(form.playersText).split('\n').map((s) => s.trim()).filter(Boolean);
    return {
      gameName: form.gameName,
      players,
      revealOpen: !!form.revealOpen,
      revealContent: { gender: form.gender },
      finalQuestion: String(form.finalQuestion || '').trim(),
      finalAnswers: String(form.finalAnswers || '').split(',').map((s) => s.trim()).filter(Boolean),
    };
  }

  async function create(form) {
    const payload = buildPayload(form);
    const res = await api.createGame(state.pw, payload);
    if (res.error) throw new Error(res.error);
    state.lastGameId = res.gameId;
    return `${origin}/play.html?game=${res.gameId}`;
  }

  async function setReveal(gameId, open) {
    const res = await api.setRevealOpen(state.pw, gameId, open);
    if (res.error) throw new Error(res.error);
    return res;
  }

  function renderLogin() {
    const node = el(`<div class="card">
      <h1>Admin</h1>
      <input id="pw" type="password" placeholder="Admin password" />
      <button class="btn" id="go">Continue</button>
    </div>`);
    node.querySelector('#go').onclick = () => { setPassword(node.querySelector('#pw').value); renderForm(); };
    set(node);
  }

  function renderForm() {
    const node = el(`<div class="card">
      <h1>Create a game</h1>
      <input id="gameName" placeholder="Game name (e.g. Baby R)" />
      <textarea id="players" rows="6" placeholder="One player name per line"></textarea>
      <label>Reveal content</label>
      <select id="gender"><option value="girl">Girl</option><option value="boy">Boy</option></select>
      <label>Final question (optional)</label>
      <input id="finalQuestion" placeholder="Question — split word-by-word into player codes" />
      <input id="finalAnswers" placeholder="Final answer(s), comma-separated (optional)" />
      <label><input type="checkbox" id="revealOpen" /> Reveal open immediately (no waiting)</label>
      <button class="btn" id="create">Create game</button>
      <p><a href="#" id="manage">Manage an existing game →</a></p>
      <p id="err" style="color:#c00"></p>
    </div>`);
    node.querySelector('#create').onclick = async () => {
      try {
        const link = await create({
          gameName: node.querySelector('#gameName').value,
          playersText: node.querySelector('#players').value,
          revealOpen: node.querySelector('#revealOpen').checked,
          gender: node.querySelector('#gender').value,
          finalQuestion: node.querySelector('#finalQuestion').value,
          finalAnswers: node.querySelector('#finalAnswers').value,
        });
        renderResult(link);
      } catch (e) { node.querySelector('#err').textContent = e.message; }
    };
    node.querySelector('#manage').onclick = (e) => { e.preventDefault(); renderManage(); };
    set(node);
  }

  function wireRevealControls(node, getGameId) {
    node.querySelector('#open').onclick = async () => {
      try { await setReveal(getGameId(), true); node.querySelector('#status').textContent = 'Reveal is OPEN 🔓 — it fires once everyone has finished.'; }
      catch (e) { node.querySelector('#status').textContent = 'Error: ' + e.message; }
    };
    node.querySelector('#close').onclick = async () => {
      try { await setReveal(getGameId(), false); node.querySelector('#status').textContent = 'Reveal is CLOSED 🔒.'; }
      catch (e) { node.querySelector('#status').textContent = 'Error: ' + e.message; }
    };
  }

  async function renderResult(link) {
    const node = el(`<div class="card">
      <h1>Game created 🎉</h1>
      <p>Share this link with players:</p>
      <input id="link" readonly value="${link}" />
      <button class="btn" id="copy">Copy link</button>
      <canvas id="qr"></canvas>
      <hr />
      <p>When everyone is on the call, open the reveal:</p>
      <button class="btn" id="open">Open reveal 🔓</button>
      <button class="btn" id="close" style="background:#bbb">Close reveal 🔒</button>
      <p id="status"></p>
      <p><a href="#" id="another">Create another</a></p>
    </div>`);
    node.querySelector('#copy').onclick = () => navigator.clipboard?.writeText(link);
    node.querySelector('#another').onclick = (e) => { e.preventDefault(); renderForm(); };
    wireRevealControls(node, () => state.lastGameId);
    set(node);
    try { const { renderQR } = await import('../ui/qr.js'); await renderQR(node.querySelector('#qr'), link); } catch (_) {}
  }

  function renderManage() {
    const node = el(`<div class="card">
      <h1>Manage a game</h1>
      <p>Paste the player link or game ID:</p>
      <input id="gid" placeholder="https://…/play.html?game=… or game ID" />
      <button class="btn" id="open">Open reveal 🔓</button>
      <button class="btn" id="close" style="background:#bbb">Close reveal 🔒</button>
      <p id="status"></p>
      <p><a href="#" id="back">← Back</a></p>
    </div>`);
    node.querySelector('#back').onclick = (e) => { e.preventDefault(); renderForm(); };
    wireRevealControls(node, () => extractGameId(node.querySelector('#gid').value));
    set(node);
  }

  const controller = { state, setPassword, buildPayload, create, setReveal, extractGameId, renderLogin, renderForm, renderResult, renderManage };
  return controller;
}

if (typeof window !== 'undefined' && document.getElementById('app') && !window.__ADMIN_TEST__) {
  const root = document.getElementById('app');
  // Include the Vite base path so shared player links point at the subpath, not the domain root.
  const origin = location.origin + import.meta.env.BASE_URL.replace(/\/$/, '');
  const c = initAdmin({ root, api: createApi(BACKEND_URL), origin });
  c.renderLogin();
}
