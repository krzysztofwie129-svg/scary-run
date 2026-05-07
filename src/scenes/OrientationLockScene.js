// OrientationLockScene — overlay na portrait mobile. Pokazuje rotującą
// ikonę telefonu + tekst "OBRÓĆ TELEFON". Uruchamiana jako overlay scene
// (game.scene.run) w main.js gdy isMobile() && isPortrait().

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export class OrientationLockScene extends Phaser.Scene {
  constructor() {
    super({ key: 'OrientationLockScene', active: false });
  }

  create() {
    // Pełnoekranowe ciemne tło (depth bardzo wysoki — overlay nad wszystkim).
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.95)
      .setDepth(99999)
      .setScrollFactor(0);

    // Ikona telefonu — narysowana w Graphics, obracana tweenem.
    const phone = this.add.graphics().setDepth(100000).setScrollFactor(0);
    phone.lineStyle(8, 0xffd93c);
    phone.strokeRoundedRect(-60, -100, 120, 200, 12);
    // Mała kropka na górze (głośnik).
    phone.fillStyle(0xffd93c, 1);
    phone.fillCircle(0, -75, 6);
    phone.x = GAME_WIDTH / 2;
    phone.y = GAME_HEIGHT / 2 - 40;

    this.tweens.add({
      targets: phone,
      angle: 90,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 130, 'OBRÓĆ TELEFON', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '48px',
      color: '#ffd93c',
      stroke: '#000000',
      strokeThickness: 6,
      align: 'center',
    }).setOrigin(0.5).setDepth(100000).setScrollFactor(0);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 195, 'Gra dziala w trybie poziomym', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5).setDepth(100000).setScrollFactor(0);
  }
}
