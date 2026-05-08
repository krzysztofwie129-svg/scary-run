// DeviceDetect — heurystyki touch + landscape. Mobile-only — gra dziala
// wylacznie na telefonie w landscape (sesja 7).

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

/** Czy można grać? mobile + landscape. */
export function canPlay() {
  // DEV: ?desktop=1 omija mobile-only check (do testów na desktopie).
  if (typeof window !== 'undefined' && window.location?.search) {
    if (new URLSearchParams(window.location.search).has('desktop')) return true;
  }
  return isMobileDevice() && isLandscape();
}

/** Listener orientation/resize. */
export function onOrientationChange(callback) {
  window.addEventListener('resize', callback);
  window.addEventListener('orientationchange', callback);
}
