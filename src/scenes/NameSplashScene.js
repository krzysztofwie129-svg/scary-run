// NameSplashScene — krótki splash "PLAYER X" przed NameInput w MP.
// Pokazywany dla playerIndex > 0 (pierwszy gracz wchodzi do NameInput
// bezpośrednio z MenuScene, kolejni dostają splash żeby się zorientowali
// że teraz oni piszą imię).

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { playFanfare } from '../utils/SuccessFanfare.js';

const SPARK_KEY = '__spark_4x4';

export class NameSplashScene extends Phaser.Scene {
  constructor() {
    super({ key: 'NameSplashScene' });
  }

  init(data) {
    this.playerIndex = data?.playerIndex ?? 0;
    this.numPlayers = data?.numPlayers ?? 1;
  }

  create() {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85);

    const playerText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, `PLAYER ${this.playerIndex + 1}`, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '120px',
      color: '#ffd93c',
      stroke: '#000000',
      strokeThickness: 8,
      shadow: { offsetX: 2, offsetY: 4, color: '#000', blur: 16, fill: true },
    }).setOrigin(0.5).setScale(0);

    const subtitle = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, 'enter your name!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '48px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);

    if (this.cache.audio.exists('click')) {
      this.sound.play('click', { volume: 0.6 });
    }
    playFanfare();

    this.tweens.add({
      targets: playerText,
      scale: 1,
      duration: 500,
      ease: 'Back.out',
    });
    this.tweens.add({
      targets: subtitle,
      alpha: 1,
      duration: 400,
      delay: 300,
    });

    // Confetti.
    if (!this.textures.exists(SPARK_KEY)) {
      const g = this.add.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture(SPARK_KEY, 4, 4);
      g.destroy();
    }
    const particles = this.add.particles(0, 0, SPARK_KEY, {
      x: { min: 0, max: GAME_WIDTH },
      y: -10,
      lifespan: 2000,
      gravityY: 200,
      speedY: { min: 100, max: 250 },
      speedX: { min: -50, max: 50 },
      scale: { start: 1.5, end: 0 },
      tint: [0xffd93c, 0xff6b9d, 0x4ad8ff, 0xffffff],
      frequency: 30,
    });
    this.time.delayedCall(1500, () => particles.stop());

    // Po 1500ms NameInputScene z flagą skipSplash żeby nie zapętlić.
    this.time.delayedCall(1500, () => {
      this.scene.start('NameInputScene', {
        playerIndex: this.playerIndex,
        numPlayers: this.numPlayers,
        skipSplash: true,
      });
    });
  }
}
