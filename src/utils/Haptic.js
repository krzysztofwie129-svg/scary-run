// Haptic — dual-backend wrapper.
//   • Native (Capacitor iOS) → Taptic Engine przez @capacitor/haptics
//     (impact Light/Medium/Heavy + notification Success/Warning/Error).
//   • Web (Android Chrome itp.) → navigator.vibrate z patternami ms.
//   • Desktop / iOS Safari / stare przeglądarki → silent no-op.
//
// iOS Safari IGNORUJE navigator.vibrate (mimo że `'vibrate' in navigator`
// bywa true) — dlatego native build MUSI iść przez Capacitor Haptics, inaczej
// gra na iPhone nie wibrowała wcale.
//
// Wartości web celowo subtelne (5-30 ms) — gracz "czuje" event bez wrażenia
// że telefon się trzęsie. crash/gameOver/gameComplete mocniejsze (dramatyczne).

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const WEB_VIBRATE_SUPPORTED =
  typeof navigator !== 'undefined' && 'vibrate' in navigator;

const isNative = () =>
  typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.();

// Native haptic — fire-and-forget, errors swallowed (np. brak Taptic Engine
// na simulatorze albo iPhone SE 1gen).
function nativeImpact(style) {
  Haptics.impact({ style }).catch(() => { /* ignore */ });
}
function nativeNotify(type) {
  Haptics.notification({ type }).catch(() => { /* ignore */ });
}
async function nativeSequence(steps) {
  // steps: tablica { impact?, notify?, delay? } wykonywana sekwencyjnie.
  for (const s of steps) {
    try {
      if (s.impact) await Haptics.impact({ style: s.impact });
      if (s.notify) await Haptics.notification({ type: s.notify });
    } catch (_) { /* ignore */ }
    if (s.delay) await new Promise((r) => setTimeout(r, s.delay));
  }
}

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
    launch: [15, 30, 15],
    tap: 8,
  },

  /** Web-only raw vibrate (Android Chrome). Native ignoruje. */
  vibrate(pattern) {
    if (!WEB_VIBRATE_SUPPORTED) return false;
    try {
      return navigator.vibrate(pattern);
    } catch (e) {
      return false;
    }
  },

  // Wrappery — każda metoda routuje native→Capacitor, web→navigator.vibrate.
  coin() {
    if (isNative()) return nativeImpact(ImpactStyle.Light);
    return this.vibrate(this.patterns.coin);
  },
  diamond() {
    if (isNative()) return nativeImpact(ImpactStyle.Medium);
    return this.vibrate(this.patterns.diamond);
  },
  jump() {
    if (isNative()) return nativeImpact(ImpactStyle.Light);
    return this.vibrate(this.patterns.jump);
  },
  slide() {
    if (isNative()) return nativeImpact(ImpactStyle.Light);
    return this.vibrate(this.patterns.slide);
  },
  crash() {
    if (isNative()) {
      // Death/crash combo — 2× heavy + error notification (Taptic Engine).
      nativeSequence([
        { impact: ImpactStyle.Heavy, delay: 90 },
        { impact: ImpactStyle.Heavy, delay: 90 },
        { notify: NotificationType.Error },
      ]);
      return;
    }
    return this.vibrate(this.patterns.crash);
  },
  gameOver() {
    if (isNative()) {
      nativeSequence([
        { impact: ImpactStyle.Heavy, delay: 110 },
        { impact: ImpactStyle.Heavy, delay: 110 },
        { notify: NotificationType.Error },
      ]);
      return;
    }
    return this.vibrate(this.patterns.gameOver);
  },
  levelComplete() {
    if (isNative()) return nativeNotify(NotificationType.Success);
    return this.vibrate(this.patterns.levelComplete);
  },
  gameComplete() {
    if (isNative()) {
      nativeSequence([
        { impact: ImpactStyle.Medium, delay: 90 },
        { impact: ImpactStyle.Heavy, delay: 90 },
        { notify: NotificationType.Success },
      ]);
      return;
    }
    return this.vibrate(this.patterns.gameComplete);
  },
  extraLife() {
    if (isNative()) return nativeNotify(NotificationType.Success);
    return this.vibrate(this.patterns.extraLife);
  },
  /** App launch — medium tap potwierdza wejście do gry (single shot). */
  launch() {
    if (isNative()) return nativeImpact(ImpactStyle.Medium);
    return this.vibrate(this.patterns.launch);
  },
  /** UI tap — lekki feedback na klik przycisku (menu, sklep, ustawienia). */
  tap() {
    if (isNative()) return nativeImpact(ImpactStyle.Light);
    return this.vibrate(this.patterns.tap);
  },

  /** Stop wszystkich pending wibracji (web — np. przy scene transition). */
  stop() {
    if (!WEB_VIBRATE_SUPPORTED) return;
    try { navigator.vibrate(0); } catch (e) { /* ignore */ }
  },
};
