// OrientationGuard — singleton zarządzający orientation lock. Gdy nie można
// grać (desktop / portrait / tablet > 1100px), uruchamia OrientationLockScene.
// Po powrocie do landscape mobile, wraca do poprzednio aktywnej sceny.
//
// WAŻNE: Phaser game.scene.start(key) NIE zatrzymuje innych scen automatycznie
// (dodaje target jako kolejną aktywną). Jawnie .stop() poprzedniej żeby nie
// nakładała się jako tło na OrientationLock (i odwrotnie przy powrocie).

import { canPlay, onOrientationChange } from './DeviceDetect.js';

class OrientationGuard {
  constructor() {
    this.game = null;
    this.lastSceneKey = null;
    this.lockActive = false;
    // Flaga aktywacji (sesja 7.3) — `check()` returns early dopóki PreloadScene
    // nie wywoła `start()`. Wcześniejsze auto-init z setTimeout 200ms strzelało
    // zanim preloader skończył ładowanie → overlay rotacji nakładał się na
    // progress bar ładowania. Teraz: 1) loading 2) start() 3) check().
    this.started = false;
  }

  init(game) {
    this.game = game;
    // Listener orientation/resize zarejestrowany od razu — ale `check()`
    // zignoruje wywołania dopóki `started === false`. Dzięki temu obrót
    // ekranu w trakcie ładowania nie pokaże OrientationLock.
    onOrientationChange(() => this.check());
  }

  /** Wywoływane przez PreloadScene po `complete` event. Aktywuje sprawdzanie. */
  start() {
    this.started = true;
    this.check();
  }

  /** Aktywne sceny inne niż OrientationLock (do zatrzymania przy locku). */
  getOtherActiveScenes() {
    if (!this.game) return [];
    return this.game.scene.getScenes(true)
      .map((s) => s.scene.key)
      .filter((k) => k && k !== 'OrientationLockScene');
  }

  check() {
    if (!this.game) return;
    if (!this.started) return; // gated do sesji 7.3 — patrz constructor

    if (!canPlay()) {
      if (this.lockActive) return; // już zablokowane

      const others = this.getOtherActiveScenes();
      // Zachowaj scenę do której wracamy. BootScene/PreloadScene → MenuScene.
      const fallback = others.find((k) => k !== 'BootScene' && k !== 'PreloadScene');
      this.lastSceneKey = fallback || 'MenuScene';

      // Zatrzymaj WSZYSTKIE inne aktywne sceny żeby OrientationLock był sam.
      for (const key of others) {
        try { this.game.scene.stop(key); } catch (e) { /* ignore */ }
      }
      this.game.scene.start('OrientationLockScene');
      this.lockActive = true;
    } else {
      if (!this.lockActive) return; // nic nie blokujemy

      // Wyjście z lock — zatrzymaj OrientationLockScene i wystartuj target.
      try { this.game.scene.stop('OrientationLockScene'); } catch (e) { /* ignore */ }
      const target = this.lastSceneKey || 'MenuScene';
      this.game.scene.start(target);
      this.lastSceneKey = null;
      this.lockActive = false;
    }
  }
}

export const orientationGuard = new OrientationGuard();
