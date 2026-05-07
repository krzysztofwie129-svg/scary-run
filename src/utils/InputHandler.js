// InputHandler — TYLKO tap zones (sesja 7 mobile-only). Bez klawiatury.
// Górne 60% ekranu = jump, dolne 40% = slide. Niewidzialne (alpha 0)
// interactive rectangles na bardzo wysokim depth (99998).

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export class InputHandler {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.onJump = options.onJump || (() => {});
    this.onSlide = options.onSlide || (() => {});

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
    try { this.jumpZone?.destroy(); } catch (e) { /* ignore */ }
    try { this.slideZone?.destroy(); } catch (e) { /* ignore */ }
    this.jumpZone = null;
    this.slideZone = null;
  }
}
