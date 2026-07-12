export function isRevealUnlocked({ codesIn, total, revealOpen }) {
  return revealOpen === true && total > 0 && codesIn >= total;
}
