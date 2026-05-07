// NameInputScene — pyta o imię gracza. Po ENTER:
//   • playerIndex < numPlayers - 1 → kolejny gracz (rekursja)
//   • last player → CharSelectScene

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { TextInput } from '../utils/InputHelper.js';
import { sessionManager } from '../utils/SessionManager.js';

export class NameInputScene extends Phaser.Scene {
  constructor() {
    super({ key: 'NameInputScene' });
  }

  init(data) {
    this.playerIndex = data?.playerIndex ?? 0;
    this.numPlayers = data?.numPlayers ?? 1;
    this.skipSplash = data?.skipSplash === true;
  }

  create() {
    // Dla MP, playerIndex > 0, bez flagi skipSplash → przekieruj na splash.
    // Pierwszy gracz (index 0) i SP wchodzą bezpośrednio bez splasha.
    if (this.numPlayers > 1 && this.playerIndex > 0 && !this.skipSplash) {
      this.scene.start('NameSplashScene', {
        playerIndex: this.playerIndex,
        numPlayers: this.numPlayers,
      });
      return;
    }
    // Tło: pierwsza warstwa level1 z alpha + ciemny overlay.
    if (this.textures.exists('bg_level1_layer1')) {
      const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_level1_layer1');
      bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.4);
    }
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.55);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const title = this.numPlayers > 1
      ? `Player ${this.playerIndex + 1} — enter your name`
      : 'Enter your name';
    this.add.text(GAME_WIDTH / 2, 200, title, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '48px',
      color: '#ffe066',
      stroke: '#000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 270, 'A-Z 0-9 spacja, max 12 znaków, ENTER aby zatwierdzić', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#bdaee3',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.input_ = new TextInput(this, GAME_WIDTH / 2, 380, {
      onEnter: (val) => this.confirm(val),
    });

    // Przycisk CONFIRM (alternatywa dla ENTER).
    const btn = this.add.zone(GAME_WIDTH / 2, 500, 240, 60).setInteractive({ useHandCursor: true });
    const btnGfx = this.add.graphics();
    btnGfx.fillStyle(0x6b3eb6, 1);
    btnGfx.fillRoundedRect(GAME_WIDTH / 2 - 120, 470, 240, 60, 14);
    btnGfx.lineStyle(3, 0xffe066, 1);
    btnGfx.strokeRoundedRect(GAME_WIDTH / 2 - 120, 470, 240, 60, 14);
    this.add.text(GAME_WIDTH / 2, 500, 'CONFIRM', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '26px',
      color: '#fff',
    }).setOrigin(0.5);
    btn.on('pointerup', () => this.confirm(this.input_.value));
  }

  confirm(value) {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      this.input_.shake();
      return;
    }
    sessionManager.setName(this.playerIndex, trimmed);

    if (this.playerIndex < this.numPlayers - 1) {
      // Wyczyść scenę zanim restart żeby keyboard listener nie wisiał.
      this.input_?.destroy();
      this.scene.start('NameInputScene', { playerIndex: this.playerIndex + 1, numPlayers: this.numPlayers });
    } else {
      this.input_?.destroy();
      this.scene.start('CharSelectScene');
    }
  }
}
