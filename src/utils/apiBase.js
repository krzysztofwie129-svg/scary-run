// API base URL — w przeglądarce relative (same-origin); w Capacitor native
// origin = capacitor://localhost, więc trzeba pełnego https://scaryrun.pl.
//
// Wartość VITE_API_BASE wstrzykiwana build-time przez Vite (.env.production
// dla native; pusty dla web). Detekcja Capacitor runtime jako fallback.

const BUILD_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

function isCapacitorNative() {
  try {
    return !!(window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function'
      && window.Capacitor.isNativePlatform());
  } catch { return false; }
}

const NATIVE_FALLBACK = 'https://scaryrun.pl';

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : '/' + path;
  if (BUILD_BASE) return BUILD_BASE + p;
  if (isCapacitorNative()) return NATIVE_FALLBACK + p;
  return p;
}
