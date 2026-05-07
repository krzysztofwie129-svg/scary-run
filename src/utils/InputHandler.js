// InputHandler — centralna fasada sterowania w GameScene:
//   • klawiatura: SPACE/UP → jump, DOWN/S → slide
//   • tap zones: górne 60% ekranu = jump, dolne 40% = slide
//
// Tap zones to interactive rectangles z alpha 0 (niewidzialne) pokrywające
// cały ekran, depth=99998 (pod HUD ale nad gameplay). Klik gdziekolwiek
// na ekranie = akcja zależna od pozycji Y.

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export class InputHandler {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.onJump = options.onJump || (() => {});
    this.onSlide = options.onSlide || (() => {});

    // Keyboard. Używamy event 'keydown-X' (zamiast addKey + key.on('down'))
    // bo jest spójne z resztą scen i nie wymaga ręcznego cleanup keys.
    this._kbHandlers = [];
    const bindKey = (keyName, fn) => {
      this.scene.input.keyboard.on(`keydown-${keyName}`, fn);
      this._kbHandlers.push(() => this.scene.input.keyboard.off(`keydown-${keyName}`, fn));
    };
    bindKey('SPACE', () => this.onJump());
    bindKey('UP', () => this.onJump());
    bindKey('W', () => this.onJump());
    bindKey('DOWN', () => this.onSlide());
    bindKey('S', () => this.onSlide());

    // Tap zones — górne 60% = jump, dolne 40% = slide.
    const splitY = GAME_HEIGHT * 0.6;

    this.jumpZone = scene.add.rectangle(
      GAME_WIDTH / 2,
      splitY / 2,
      GAME_WIDTH,
      splitY,
      0xffffff,
      0,
    );
    this.jumpZone.setInteractive().setScrollFactor(0).setDepth(99998);
    this.jumpZone.on('pointerdown', () => this.onJump());

    this.slideZone = scene.add.rectangle(
      GAME_WIDTH / 2,
      splitY + (GAME_HEIGHT - splitY) / 2,
      GAME_WIDTH,
      GAME_HEIGHT - splitY,
      0xffffff,
      0,
    );
    this.slideZone.setInteractive().setScrollFactor(0).setDepth(99998);
    this.slideZone.on('pointerdown', () => this.onSlide());
  }

  destroy() {
    for (const off of this._kbHandlers) {
      try { off(); } catch (e) { /* ignore */ }
    }
    this._kbHandlers.length = 0;
    try { this.jumpZone?.destroy(); } catch (e) { /* ignore */ }
    try { this.slideZone?.destroy(); } catch (e) { /* ignore */ }
    this.jumpZone = null;
    this.slideZone = null;
  }
}
