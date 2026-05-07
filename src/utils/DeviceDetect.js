// DeviceDetect — heurystyki touch / mobile / orientation. Bez analytics,
// bez user agent fingerprinting — tylko feature detection.

export function isTouchDevice() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

/** Mobile = touch + krótszy bok < 600px (telefon w jakiejkolwiek orientacji). */
export function isMobile() {
  return isTouchDevice() && Math.min(window.innerWidth, window.innerHeight) < 600;
}

export function isLandscape() {
  return window.innerWidth > window.innerHeight;
}

export function isPortrait() {
  return !isLandscape();
}

/** Helper: zarejestruj listener który strzela przy resize + orientationchange. */
export function onOrientationChange(callback) {
  window.addEventListener('resize', callback);
  window.addEventListener('orientationchange', callback);
  return () => {
    window.removeEventListener('resize', callback);
    window.removeEventListener('orientationchange', callback);
  };
}
