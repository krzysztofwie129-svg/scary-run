// Format helpers — żeby score nie wyświetlał ułamków po `+= delta/1000`
// (survival score jest float, w UI musi być int z polskim separatorem tysięcy).

/** "1234.567" → "1 234". Dla score / total score. */
export function formatScore(value) {
  return Math.floor(value).toLocaleString('pl-PL');
}

/** "12.7" → "12". Dla coins / diamonds / lives. */
export function formatNumber(value) {
  return Math.floor(value).toString();
}
