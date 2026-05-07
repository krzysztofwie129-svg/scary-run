// Haptic — wrapper na navigator.vibrate (sesja P2). Silent fail dla desktop /
// starych przeglądarek / iOS Safari (które ignorują vibrate API mimo że
// `'vibrate' in navigator` może zwrócić true). Bez alertów / console.error.
//
// Jak działa:
//   navigator.vibrate(N)         → jedna wibracja N ms
//   navigator.vibrate([a, b, c])  → wibracja a, przerwa b, wibracja c, ...
//
// Wartości celowo subtelne (5-30 ms) dla większości eventów — gracz "czuje"
// nie ma wrażenia że telefon trzęsie się. Tylko crash/gameOver/gameComplete
// mocniejsze (100-200 ms) bo dramatyczne.

const SUPPORTED = typeof navigator !== 'undefined' && 'vibrate' in navigator;

export const Haptic = {
  patterns: {
    coin: 5,
    diamond: [10, 30, 10],
    jump: 5,
    slide: 5,
    crash: [20, 50, 20],
    gameOver: [100, 50, 100, 50, 100],
    levelComplete: [20, 30, 20, 30, 100],
    gameComplete: [30, 50, 30, 50, 200, 100, 200],
    extraLife: [10, 30, 10, 30, 50],
  },

  vibrate(pattern) {
    if (!SUPPORTED) return false;
    try {
      return navigator.vibrate(pattern);
    } catch (e) {
      return false;
    }
  },

  // Wrappery — czytelniejsze w wywołaniach niż Haptic.vibrate(Haptic.patterns.X).
  coin() { return this.vibrate(this.patterns.coin); },
  diamond() { return this.vibrate(this.patterns.diamond); },
  jump() { return this.vibrate(this.patterns.jump); },
  slide() { return this.vibrate(this.patterns.slide); },
  crash() { return this.vibrate(this.patterns.crash); },
  gameOver() { return this.vibrate(this.patterns.gameOver); },
  levelComplete() { return this.vibrate(this.patterns.levelComplete); },
  gameComplete() { return this.vibrate(this.patterns.gameComplete); },
  extraLife() { return this.vibrate(this.patterns.extraLife); },

  /** Stop wszystkich pending wibracji (np. przy scene transition). */
  stop() {
    if (!SUPPORTED) return;
    try { navigator.vibrate(0); } catch (e) { /* ignore */ }
  },
};
