// InputHandler — DOM-level pointerdown listener (sesja 7.4.5).
// Tap kędykolwiek na ekranie (canvas + black margins po bokach z FIT scaling)
// = jump. Wcześniejsza wersja używała Phaser zone ograniczonego do canvas
// (1280×720 game coords) — na phone landscape canvas display ~764×430 z
// margin 84px po bokach, marginesy nie reagowały na tapy (zmarnowane miejsce).
//
// Dlaczego DOM a nie Phaser scene.input?
// scene.input.on('pointerdown') reaguje TYLKO na pointer w obrębie canvas.
// document-level listener wyłapuje WSZYSTKIE tapy w viewport — w tym
// na #game-container marginesach.
//
// Cleanup w destroy() — listener removed gdy GameScene shutdown.

export class InputHandler {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.onJump = options.onJump || (() => {});

    this._handler = (e) => {
      // Ignoruj tapy na HTML input (np. NameInputScene) — chociaż w GameScene
      // tego inputa nie ma, defensive check na wszelki wypadek.
      if (e.target && e.target.tagName === 'INPUT') return;
      this.onJump();
    };

    // 'pointerdown' łapie i mouse i touch. Mobile: touchscreen tap = pointerdown.
    document.addEventListener('pointerdown', this._handler);
  }

  destroy() {
    if (this._handler) {
      try { document.removeEventListener('pointerdown', this._handler); } catch (e) { /* ignore */ }
      this._handler = null;
    }
  }
}
