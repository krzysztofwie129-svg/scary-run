// PlayerTurnSplashScene — splash screen między graczami w MP.
// Pokazuje "PLAYER X" + imię + "Choose your character" przez ~2s, potem CharSelect.

import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_TURN_SPLASH_DURATION_MS,
} from '../config.js';
import { sessionManager } from '../utils/SessionManager.js';
import { playFanfare } from '../utils/SuccessFanfare.js';

const SPARK_KEY = '__spark_4x4';

export class PlayerTurnSplashScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlayerTurnSplashScene' });
  }

  create() {
    const player = sessionManager.currentPlayer();
    const idx = sessionManager.currentPlayerIndex;

    // Backdrop ciemny.
    const bg = this.add.graphics();
    bg.fillStyle(0x1a0a2e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, `PLAYER ${idx + 1}`, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '96px',
      color: '#ffd93c',
      stroke: '#000',
      strokeThickness: 8,
      shadow: { offsetX: 2, offsetY: 4, color: '#000', blur: 16, fill: true },
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20, player.name, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '52px',
      color: '#ffe066',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 90, 'Choose your character!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#bdaee3',
      fontStyle: 'italic',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.spawnConfetti();
    playFanfare();

    this.time.delayedCall(PLAYER_TURN_SPLASH_DURATION_MS, () => {
      this.scene.start('CharSelectScene');
    });
  }

  spawnConfetti() {
    if (!this.textures.exists(SPARK_KEY)) {
      const g = this.add.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture(SPARK_KEY, 4, 4);
      g.destroy();
    }
    const emitter = this.add.particles(0, 0, SPARK_KEY, {
      x: { min: 0, max: GAME_WIDTH },
      y: -10,
      lifespan: 2000,
      gravityY: 200,
      speedY: { min: 50, max: 150 },
      speedX: { min: -50, max: 50 },
      scale: { start: 1.5, end: 0 },
      tint: [0xffd93c, 0x4ad8ff, 0xff8aff, 0xffffff],
      frequency: 30,
    });
  }
}
