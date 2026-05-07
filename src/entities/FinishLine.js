// FinishLine — wizualna meta levelu (czarna flaga FINISH + biało-czarna
// szachownica) wygenerowana w kodzie. Detect przekroczenia linii X gracza
// emituje 'finish-line-crossed' do GameScene.
//
// Używamy Container żeby wszystkie dzieci mogły się ruszać razem (zmiana
// container.x przesuwa flag, szachownicę i napis za jednym razem).

import {
  GAME_HEIGHT,
  PLAYER_START_X,
  FINISH_LINE_WIDTH,
  FINISH_LINE_HEIGHT,
  FINISH_LINE_CHECKER_SIZE,
  FINISH_LINE_FLAG_HEIGHT,
} from '../config.js';

export class FinishLine extends Phaser.GameObjects.Container {
  constructor(scene, x) {
    super(scene, x, 0);
    scene.add.existing(this);

    // Tło (cała wysokość mety).
    const blackBg = scene.add.rectangle(
      0,
      FINISH_LINE_FLAG_HEIGHT + FINISH_LINE_HEIGHT / 2,
      FINISH_LINE_WIDTH,
      FINISH_LINE_HEIGHT,
      0x000000,
    );

    // Szachownica biała na czarnym tle.
    const checker = scene.add.graphics();
    checker.fillStyle(0xffffff, 1);
    const cols = Math.ceil(FINISH_LINE_WIDTH / FINISH_LINE_CHECKER_SIZE);
    const rows = Math.ceil(FINISH_LINE_HEIGHT / FINISH_LINE_CHECKER_SIZE);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if ((r + c) % 2 === 0) {
          checker.fillRect(
            -FINISH_LINE_WIDTH / 2 + c * FINISH_LINE_CHECKER_SIZE,
            FINISH_LINE_FLAG_HEIGHT + r * FINISH_LINE_CHECKER_SIZE,
            FINISH_LINE_CHECKER_SIZE,
            FINISH_LINE_CHECKER_SIZE,
          );
        }
      }
    }

    // Czarna flaga z napisem FINISH na górze.
    const flag = scene.add.rectangle(
      0,
      FINISH_LINE_FLAG_HEIGHT / 2,
      FINISH_LINE_WIDTH,
      FINISH_LINE_FLAG_HEIGHT,
      0x000000,
    );
    const flagText = scene.add.text(0, FINISH_LINE_FLAG_HEIGHT / 2, 'FINISH', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.add([blackBg, checker, flag, flagText]);
    this.setDepth(7); // nad ground/coins/obstacles, pod player

    // Pulsujący napis (ciągłe yoyo).
    scene.tweens.add({
      targets: flagText,
      scale: 1.15,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.crossed = false;
  }

  update(worldSpeed, delta) {
    this.x -= worldSpeed * (delta / 1000);
    if (!this.crossed && this.x < PLAYER_START_X) {
      this.crossed = true;
      this.scene.events.emit('finish-line-crossed');
    }
  }
}
