// OrientationLockScene — pełnoekranowy splash gdy nie można grać.
// Trzy warianty:
//   • mobile portrait → nowy portretowy layout (BG + frame + skull title +
//     phone-rotate icon + subtitle, sesja 8.x). Canvas resize 720×1280
//     żeby content wypełnił portretowy viewport zamiast letterbox.
//   • desktop → "GRA TYLKO NA TELEFONIE" (Phaser graphics + text).
//   • mobile landscape ale za duży viewport → "EKRAN ZA DUZY".

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { isMobileDevice, isPortrait } from '../utils/DeviceDetect.js';

export class OrientationLockScene extends Phaser.Scene {
  constructor() {
    super({ key: 'OrientationLockScene' });
  }

  create() {
    const portraitMode = isMobileDevice() && isPortrait();

    // Resize canvas do portrait jeśli portrait+mobile — żeby BG/frame
    // wypełniły viewport. Restore do landscape na shutdown (kiedy
    // OrientationGuard wraca do MenuScene).
    if (portraitMode && this.textures.exists('orientation_bg')) {
      this.scale.setGameSize(720, 1280);
      this.scale.refresh();
      this.events.once('shutdown', () => {
        this.scale.setGameSize(GAME_WIDTH, GAME_HEIGHT);
        this.scale.refresh();
      });
      this.buildPortrait();
    } else {
      this.buildLegacy();
    }
  }

  /** Nowy portretowy layout używający 5 assetów ui/orientation_*. */
  buildPortrait() {
    const w = 720;
    const h = 1280;

    // 1. BG — full screen Halloween portrait scene.
    this.add.image(w / 2, h / 2, 'orientation_bg').setDisplaySize(w, h);

    // 2. Phone-rotate icon — center upper, z pulse rotation animation.
    const phone = this.add.image(w / 2, 530, 'orientation_phone').setDisplaySize(360, 360);
    this.tweens.add({
      targets: phone,
      angle: 12,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 3. Title "OBRÓĆ TELEFON" — pod ikoną.
    this.add.image(w / 2, 830, 'orientation_title').setDisplaySize(560, 140);

    // 4. Subtitle "Gra działa w trybie poziomym" — pod tytułem.
    this.add.image(w / 2, 960, 'orientation_subtitle').setDisplaySize(560, 112);

    // 5. Frame — overlay (skull-decorated portrait border).
    this.add.image(w / 2, h / 2, 'orientation_frame').setDisplaySize(w, h);
  }

  /** Stary layout (desktop / mobile-landscape-too-big) — Phaser graphics + text. */
  buildLegacy() {
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000);

    let titleText;
    let subtitleText;

    if (!isMobileDevice()) {
      titleText = 'GRA TYLKO NA TELEFONIE';
      subtitleText = 'Otworz ten link na smartfonie';
    } else {
      titleText = 'EKRAN ZA DUZY';
      subtitleText = 'Otworz na telefonie';
    }

    const phoneG = this.add.graphics();
    phoneG.lineStyle(8, 0xffd93c);
    phoneG.strokeRoundedRect(-60, -100, 120, 200, 12);
    phoneG.fillStyle(0xffd93c, 1);
    phoneG.fillCircle(0, -75, 5);
    phoneG.x = GAME_WIDTH / 2;
    phoneG.y = GAME_HEIGHT / 2 - 80;

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
