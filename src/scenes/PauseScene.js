// PauseScene — overlay scene aktywowana z GameScene (sesja P1, redesign 8.x).
// `this.scene.launch('PauseScene', { parentSceneKey })` w GameScene.pauseGame()
// po wcześniejszym `this.scene.pause()`.

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { GameStateStore } from '../utils/GameStateStore.js';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PauseScene' });
  }

  init(data) {
    this.parentSceneKey = data?.parentSceneKey || 'GameScene';
  }

  create() {
    // Półprzezroczyste overlay przyciemnienie.
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.78)
      .setDepth(0);

    // Title PAUZA.
    if (this.textures.exists('pause_title')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 160, 'pause_title')
        .setDisplaySize(360, 120).setDepth(1);
    } else {
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 160, 'PAUZA', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '96px',
        color: '#ffd93c',
        stroke: '#000000',
        strokeThickness: 8,
      }).setOrigin(0.5).setDepth(1);
    }

    this.makeImageButton(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, 'pause_btn_resume',
      400, 100, () => this.resume(), '▶ WZNOW');

    this.makeImageButton(GAME_WIDTH / 2, GAME_HEIGHT - 140, 'pause_btn_menu',
      360, 90, () => this.exitToMenu(), 'MENU GLOWNE');
  }

  makeImageButton(x, y, textureKey, w, h, onClick, fallbackLabel) {
    let btn;
    if (this.textures.exists(textureKey)) {
      btn = this.add.image(x, y, textureKey).setDisplaySize(w, h).setDepth(1);
      const sx = btn.scaleX;
      const sy = btn.scaleY;
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setScale(sx * 1.05, sy * 1.05));
      btn.on('pointerout', () => btn.setScale(sx, sy));
      btn.on('pointerdown', () => btn.setScale(sx * 0.95, sy * 0.95));
      btn.on('pointerup', () => { btn.setScale(sx, sy); onClick(); });
    } else {
      btn = this.add.text(x, y, fallbackLabel, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '36px',
        color: '#fff',
        backgroundColor: '#5C3E70',
        padding: { x: 28, y: 14 },
      }).setOrigin(0.5).setDepth(1).setInteractive({ useHandCursor: true });
      btn.on('pointerup', onClick);
    }
    return btn;
  }

  resume() {
    this.scene.stop();
    this.scene.resume(this.parentSceneKey);
  }

  exitToMenu() {
    GameStateStore.clear();
    this.scene.stop();
    this.scene.stop(this.parentSceneKey);
    this.scene.start('MenuScene');
  }
}
