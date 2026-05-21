// DeviceDetect — heurystyki touch + landscape.
// Telefon: gra tylko w landscape. Desktop: gra zawsze (2026-05 — wznowiony
// tryb desktop; wcześniej gra była mobile-only od sesji 7).

export function isTouchDevice() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

/** Mobile = touch + maks. przekątna ≤ 1100px (smartphone, mniejsze tablety). */
export function isMobileDevice() {
  if (!isTouchDevice()) return false;
  const maxDim = Math.max(window.innerWidth, window.innerHeight);
  return maxDim <= 1100;
}

export function isLandscape() {
  return window.innerWidth > window.innerHeight;
}

export function isPortrait() {
  return !isLandscape();
}

/** Desktop = brak touchscreena ALBO ekran większy niż telefon (laptop, monitor).
 *  Laptop z ekranem dotykowym (touch + duży ekran) też traktujemy jak desktop. */
export function isDesktop() {
  if (!isTouchDevice()) return true;
  return Math.max(window.innerWidth, window.innerHeight) > 1100;
}

/** Czy można grać? Desktop — zawsze. Telefon — tylko w landscape. */
export function canPlay() {
  // DEV: ?desktop=1 zachowane dla kompatybilności (puppeteer / testy).
  if (typeof window !== 'undefined' && window.location?.search) {
    if (new URLSearchParams(window.location.search).has('desktop')) return true;
  }
  if (isDesktop()) return true;
  return isMobileDevice() && isLandscape();
}

/** Listener orientation/resize. */
export function onOrientationChange(callback) {
  window.addEventListener('resize', callback);
  window.addEventListener('orientationchange', callback);
}
