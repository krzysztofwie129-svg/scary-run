// PauseScene — overlay scene aktywowana z GameScene (sesja P1).
// `this.scene.launch('PauseScene', { parentSceneKey })` w GameScene.pauseGame()
// po wcześniejszym `this.scene.pause()`.
//
// RESUME = stop PauseScene + scene.resume(parentSceneKey).
// MAIN MENU = clear save + stop both scenes + scene.start('MenuScene').

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
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75)
      .setDepth(0);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, 'PAUZA', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '96px',
      color: '#ffd93c',
      stroke: '#000000',
      strokeThickness: 8,
    }).setOrigin(0.5).setDepth(1);

    const resumeBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, '▶ WZNOW', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '48px',
      color: '#ffffff',
      backgroundColor: '#5C3E70',
      padding: { x: 40, y: 16 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(1);
    resumeBtn.on('pointerdown', () => this.resume());

    // y=GAME_HEIGHT-180 (sesja 7.1 safe-zone iPhone bottom).
    const menuBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 180, 'MENU GLOWNE', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '32px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 24, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(1);
    menuBtn.on('pointerdown', () => this.exitToMenu());
  }

  resume() {
    this.scene.stop();
    this.scene.resume(this.parentSceneKey);
  }

  exitToMenu() {
    // Świadome wyjście z gry — clear save (refresh nie pokaże "Continue").
    GameStateStore.clear();
    this.scene.stop();
    this.scene.stop(this.parentSceneKey);
    this.scene.start('MenuScene');
  }
}
