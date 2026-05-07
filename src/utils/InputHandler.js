// InputHandler — TYLKO tap zone (sesja 8 jump-only). Cały ekran = jump.
// Bez slideZone (slide został usunięty — gameplay tylko skoki).
// Niewidzialny (alpha 0) interactive rectangle na bardzo wysokim depth (99998).

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export class InputHandler {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.onJump = options.onJump || (() => {});

    this.jumpZone = scene.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0xffffff,
      0,
    );
    this.jumpZone.setInteractive().setScrollFactor(0).setDepth(99998);
    this.jumpZone.on('pointerdown', () => this.onJump());
  }

  destroy() {
    try { this.jumpZone?.destroy(); } catch (e) { /* ignore */ }
    this.jumpZone = null;
  }
}
