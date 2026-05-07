// BootScene — pierwsza scena uruchamiana przez Phaser.
// Ładuje minimum potrzebne do narysowania ekranu loadera (PreloadScene),
// żeby user widział zaraz po wejściu cokolwiek niż czarny canvas.
//
// W kolejnych sesjach: tu można dorzucić logo gry jako PNG, font bitmapowy
// dla progress bara, etc. Na MVP wystarczy szkielet z czystym tekstem.

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Tu wyłącznie minimalne assety — logo loadera, ewentualnie 1-2 ikonki.
    // Pełen preload (postacie, tileset, audio) idzie w PreloadScene.
  }

  create() {
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Boot…', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#bdaee3',
    }).setOrigin(0.5);

    // Krótki delay przed PreloadScene, żeby Boot nie błyskał na 1 frame.
    this.time.delayedCall(100, () => {
      this.scene.start('PreloadScene');
    });
  }
}
