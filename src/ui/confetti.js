// src/ui/confetti.js
import confetti from 'canvas-confetti';

export function celebrate(gender) {
  const colors = gender === 'boy' ? ['#4aa8ff', '#1e6fd8', '#ffffff'] : ['#ff6fae', '#e83e8c', '#ffffff'];
  let frames = 120;
  (function frame() {
    confetti({ particleCount: 6, spread: 70, origin: { y: 0.6 }, colors });
    if (frames-- > 0) requestAnimationFrame(frame);
  })();
}
