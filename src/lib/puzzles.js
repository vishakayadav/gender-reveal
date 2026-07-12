// src/lib/puzzles.js
export function checkAnswer(puzzle, input) {
  const norm = String(input).trim().toLowerCase();
  return puzzle.answers.some((a) => String(a).trim().toLowerCase() === norm);
}
