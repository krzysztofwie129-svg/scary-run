// FullscreenManager — wrapper na Fullscreen API + Wake Lock API (sesja P3).
// Silent fail dla nieobsługiwanych platform (iOS Safari nie wspiera fullscreen
// dla zwykłych stron, ale wspiera tryb PWA przez apple-mobile-web-app-capable
// meta. Dla iOS Safari fullscreen to no-op — gracz tego nie zauważy).
//
// User gesture wymagany: enter() musi być wywołane synchronicznie z handlera
// tap/click/keydown. Wywołania z setTimeout/update() przeglądarka odrzuci.

let wakeLockSentinel = null;

export const FullscreenManager = {
  /**
   * Request fullscreen. MUSI być wywołane z user gesture (tap/click/keypress).
   * Zwraca natychmiast — async ale nie czekamy.
   */
  async enter() {
    const elem = document.documentElement;
    try {
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
    } catch (e) {
      // User odrzucił, browser nie wspiera, lub brak gesture — silent skip.
    }
  },

  /**
   * Wake Lock — ekran nie gaśnie w trakcie gry.
   * Wspierane: Chrome 84+, Edge, Safari 16.4+ (iOS).
   * Wake lock automatycznie wygasa przy ukryciu tabu.
   */
  async keepAwake() {
    if (!('wakeLock' in navigator)) return false;
    try {
      if (wakeLockSentinel && !wakeLockSentinel.released) return true;
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      wakeLockSentinel.addEventListener('release', () => {
        wakeLockSentinel = null;
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  /** Zwolnij wake lock (np. powrót do menu). */
  async releaseWakeLock() {
    if (wakeLockSentinel && !wakeLockSentinel.released) {
      try {
        await wakeLockSentinel.release();
      } catch (e) { /* ignore */ }
      wakeLockSentinel = null;
    }
  },

  /** Re-acquire po visibility change (gracz wraca do tabu). */
  async reacquireIfNeeded() {
    if (document.visibilityState === 'visible' && !wakeLockSentinel) {
      await this.keepAwake();
    }
  },

  isSupported() {
    return {
      fullscreen: !!(document.documentElement.requestFullscreen
        || document.documentElement.webkitRequestFullscreen),
      wakeLock: 'wakeLock' in navigator,
    };
  },
};
