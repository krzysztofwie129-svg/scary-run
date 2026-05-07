// DeviceDetect — heurystyki touch / mobile / orientation. Bez analytics,
// bez user agent fingerprinting — tylko feature detection.

export function isTouchDevice() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

/** Mobile = touch + krótszy bok < 900px (telefony do dużych Androidów). */
export function isMobile() {
  return isTouchDevice() && Math.min(window.innerWidth, window.innerHeight) < 900;
}

export function isLandscape() {
  return window.innerWidth > window.innerHeight;
}

export function isPortrait() {
  return !isLandscape();
}

/** Czy gra jest aktualnie obrócona przez CSS (mobile + portrait). */
export function isRotatedByCSS() {
  return isMobile() && isPortrait();
}

/**
 * Efektywne wymiary viewport widziane PRZEZ GRĘ — po uwzględnieniu CSS rotacji.
 * Gdy telefon trzymany pionowo, kontener jest obrócony o 90° → szerokość gry
 * to faktycznie window.innerHeight, a wysokość to window.innerWidth.
 */
export function getEffectiveViewport() {
  if (isRotatedByCSS()) {
    return { width: window.innerHeight, height: window.innerWidth };
  }
  return { width: window.innerWidth, height: window.innerHeight };
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
