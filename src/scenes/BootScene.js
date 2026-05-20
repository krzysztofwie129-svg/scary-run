// BootScene — pierwsza scena uruchamiana przez Phaser.
// Ładuje minimum potrzebne do narysowania ekranu loadera (PreloadScene),
// żeby user widział zaraz po wejściu cokolwiek niż czarny canvas.
//
// W kolejnych sesjach: tu można dorzucić logo gry jako PNG, font bitmapowy
// dla progress bara, etc. Na MVP wystarczy szkielet z czystym tekstem.

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptic } from '../utils/Haptic.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Loading screen assets — tylko 4 lekkie pliki, ładowane PRZED PreloadScene
    // żeby progress bar mógł użyć nowej grafiki Halloween Night.
    this.load.image('loading_bg', 'assets/ui/loading_bg.webp');
    this.load.image('loading_text', 'assets/ui/loading_text.webp');
    this.load.image('loading_bar_frame', 'assets/ui/loading_bar_frame.webp');
    this.load.image('loading_bar_fill', 'assets/ui/loading_bar_fill.webp');
    // Logo gry — wyświetlane nad progress barem w PreloadScene + reused w MenuScene.
    this.load.image('menu_logo', 'assets/ui/menu_logo.webp');
  }

  async create() {
    // 2026-05-13: czekaj na PlayerSync.initialLoad przed start PreloadScene.
    // Inaczej user klika GRAJ zanim KV snapshot zsynchronizuje localStorage
    // → getCurrentLevel() zwraca default 1 → start L1 mimo unlock L18.
    // Max 1s timeout — gdy backend niedostepny lub offline, kontynuujemy z
    // lokalnymi danymi. Wcześniej 3s, ale na offline launch dawało 3s czarnej
    // dziury między native splash a in-game loaderem.
    // navigator.onLine === false → pomijamy fetch całkowicie (instant skip).
    const isOffline = (typeof navigator !== 'undefined' && navigator.onLine === false);
    if (window.__playerSyncReady && !isOffline) {
      try {
        await Promise.race([
          window.__playerSyncReady,
          new Promise((resolve) => setTimeout(resolve, 1000)),
        ]);
      } catch (_) { /* ignore — fallback do lokalnego stanu */ }
    }

    // Capacitor native splash: trzymany do tego momentu (capacitor.config.json
    // launchAutoHide=false). Ukrywamy DOPIERO gdy BootScene preload skończył
    // ładować assety paska (loading_bg, menu_logo, loading_bar_*) → PreloadScene
    // od razu rysuje in-game loader bez czarnej dziury między native splash a grą.
    try {
      if (window.Capacitor?.isNativePlatform?.()) {
        await SplashScreen.hide({ fadeOutDuration: 250 });
      }
    } catch (_) { /* ignore — web build */ }

    // Launch haptic — medium tap potwierdza wejście do gry (single shot).
    Haptic.launch();

    // Krótki delay przed PreloadScene, żeby Boot nie błyskał na 1 frame.
    this.time.delayedCall(50, () => {
      this.scene.start('PreloadScene');
    });
  }
}
