// src/ui/reveal-anim.js — the reveal sequence: 5→1 countdown, rising pastel
// balloons, confetti burst, then "Congratulations!", the rhyme, a floating
// baby illustration, and "It's a …". Pure CSS + confetti, no extra deps.
import confetti from 'canvas-confetti';
import babyGirl from '../assets/baby-girl.png';
import babyBoy from '../assets/baby-boy.png';

const PINKS = ['#ffb3d1', '#ff9ec4', '#ffc9de'];
const BLUES = ['#a9d8ff', '#8ec5ff', '#c7e6ff'];
const NEUTRAL = ['#fff4f9', '#f3f7ff', '#ffe8b0'];

const rand = (a, b) => a + Math.random() * (b - a);

// Play the full reveal. `reveal` is { gender: 'girl'|'boy', message?: string }.
// opts.seconds overrides the countdown length (default 5); opts.mount/document
// are for testing. Returns the overlay element.
export function playReveal(reveal, opts = {}) {
  const gender = reveal && reveal.gender === 'boy' ? 'boy' : 'girl';
  const message = (reveal && reveal.message) || '';
  const doc = opts.document || document;
  const seconds = opts.seconds != null ? opts.seconds : 5;

  const babySrc = gender === 'boy' ? babyBoy : babyGirl;
  const overlay = doc.createElement('div');
  overlay.className = 'reveal-overlay';
  // The baby <img> src is set now (while hidden behind the countdown) so it
  // finishes loading during the 5s countdown — no flash when the message shows.
  overlay.innerHTML = `
    <div class="reveal-veil"></div>
    <div class="reveal-tint"></div>
    <div class="reveal-balloons"></div>
    <div class="reveal-count"></div>
    <div class="reveal-msg">
      <div class="reveal-congrats">Congratulations!</div>
      <div class="reveal-rhyme">Twinkle twinkle little star,<br>now we know what you are ✨</div>
      <img class="reveal-baby" alt="" src="${babySrc}" />
      <div class="reveal-big"></div>
    </div>`;
  (opts.mount || doc.body).appendChild(overlay);

  const countEl = overlay.querySelector('.reveal-count');
  const balloonsEl = overlay.querySelector('.reveal-balloons');
  const tint = overlay.querySelector('.reveal-tint');
  const msg = overlay.querySelector('.reveal-msg');

  function showNum(n) {
    countEl.innerHTML = `<div class="reveal-ring"></div><div class="reveal-num tick">${n}</div>`;
  }

  function makeBalloon() {
    const wrap = doc.createElement('div');
    wrap.className = 'b-wrap';
    const pool = (gender === 'boy' ? BLUES : PINKS).concat(NEUTRAL);
    const color = pool[Math.floor(Math.random() * pool.length)];
    const size = rand(48, 94);
    wrap.style.left = rand(0, 96) + 'vw';
    const dur = rand(4.5, 8);
    wrap.style.animationDuration = dur + 's';

    const b = doc.createElement('div');
    b.className = 'balloon';
    b.style.background = color;
    b.style.color = color; // knot (::before) uses currentColor
    b.style.width = size + 'px';
    b.style.height = size * 1.24 + 'px';
    b.style.animationDuration = rand(1.6, 3) + 's';
    const string = doc.createElement('div');
    string.className = 'string';
    b.appendChild(string);
    wrap.appendChild(b);
    balloonsEl.appendChild(wrap);
    setTimeout(() => wrap.remove(), dur * 1000 + 300);
  }

  function burst() {
    if (typeof confetti !== 'function') return;
    const colors = gender === 'boy'
      ? ['#4aa8ff', '#8ec5ff', '#cbe6ff', '#ffe8b0']
      : ['#ff6fae', '#ff9ec4', '#ffd1e6', '#ffe8b0'];
    const end = Date.now() + 1400;
    (function frame() {
      confetti({ particleCount: 5, angle: 60, spread: 70, origin: { x: 0, y: 0.9 }, colors });
      confetti({ particleCount: 5, angle: 120, spread: 70, origin: { x: 1, y: 0.9 }, colors });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
    confetti({ particleCount: 140, spread: 100, origin: { y: 0.6 }, colors, scalar: 1.1 });
  }

  function reveal_() {
    tint.classList.add(gender);
    for (let i = 0; i < 26; i++) setTimeout(makeBalloon, i * 120);
    burst();
    overlay.querySelector('.reveal-big').textContent =
      message || (gender === 'boy' ? "It's a BOY! 💙" : "It's a GIRL! 💖");
    msg.classList.add(gender, 'show');
  }

  let n = seconds;
  showNum(n);
  const step = () => {
    n -= 1;
    if (n >= 1) { showNum(n); setTimeout(step, 1000); }
    else { countEl.innerHTML = ''; reveal_(); }
  };
  setTimeout(step, 1000);
  return overlay;
}
