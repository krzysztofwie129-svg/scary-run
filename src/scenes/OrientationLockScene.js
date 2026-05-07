// OrientationLockScene — pełnoekranowy splash gdy nie można grać.
// Trzy warianty komunikatu: desktop, mobile portrait, mobile landscape ale za duży.

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { isMobileDevice, isPortrait } from '../utils/DeviceDetect.js';

export class OrientationLockScene extends Phaser.Scene {
  constructor() {
    super({ key: 'OrientationLockScene' });
  }

  create() {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000);

    let titleText;
    let subtitleText;
    const showRotateAnim = isMobileDevice() && isPortrait();

    if (!isMobileDevice()) {
      titleText = 'GRA TYLKO NA TELEFONIE';
      subtitleText = 'Otworz ten link na smartfonie';
    } else if (isPortrait()) {
      titleText = 'OBROC TELEFON';
      subtitleText = 'Gra dziala w trybie poziomym';
    } else {
      // Edge case — mobile + landscape ale jeszcze za duży viewport.
      titleText = 'EKRAN ZA DUZY';
      subtitleText = 'Otworz na telefonie';
    }

    // Ikona telefonu — rysunek graficzny.
    const phoneG = this.add.graphics();
    phoneG.lineStyle(8, 0xffd93c);
    phoneG.strokeRoundedRect(-60, -100, 120, 200, 12);
    phoneG.fillStyle(0xffd93c, 1);
    phoneG.fillCircle(0, -75, 5);
    phoneG.x = GAME_WIDTH / 2;
    phoneG.y = GAME_HEIGHT / 2 - 80;

    if (showRotateAnim) {
      this.tweens.add({
        targets: phoneG,
        angle: 90,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, titleText, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '54px',
      color: '#ffd93c',
      stroke: '#000000',
      strokeThickness: 6,
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 145, subtitleText, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '26px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5);
  }
}
