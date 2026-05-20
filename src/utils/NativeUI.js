// NativeUI — konfiguracja natywnego "chrome" systemu (status bar) dla buildu
// Capacitor. Gra to runner w landscape i HUD (serca/level po lewej,
// score/pause po prawej) ma sztywne pozycje Y u góry canvasu.
//
// PROBLEM (Android): status bar systemu w landscape siedzi NA GÓRZE, a webview
// z capacitor.config `overlaysWebView: true` rysuje POD nim → zegar/bateria
// nakładają się na HUD. Rozwiązanie standardowe dla gier: immersive — chowamy
// status bar w native (StatusBar.hide()).
//
// ZAKRES: tylko Android. iOS jest już wydane w App Store — celowo go NIE
// dotykamy z tego utila, żeby zachowanie żywej apki było identyczne. iOS w
// landscape i tak chowa status bar systemowo, więc nic nie traci. Gdyby kiedyś
// chcieć ujednolicić — wystarczy poszerzyć `isAndroidNative` o iOS.
//
// Web: no-op (przeglądarka nie ma natywnego status bara).

import { StatusBar } from '@capacitor/status-bar';

const isAndroidNative = () =>
  typeof window !== 'undefined'
  && window.Capacitor?.isNativePlatform?.()
  && window.Capacitor?.getPlatform?.() === 'android';

/** Ukrywa status bar na Androidzie. Fire-and-forget, błędy zjadane. */
export function initNativeUI() {
  if (!isAndroidNative()) return;
  StatusBar.hide().catch(() => { /* plugin brak / platforma — ignore */ });
}
