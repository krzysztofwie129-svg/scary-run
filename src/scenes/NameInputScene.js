// NameInputScene (sesja 7) — używa NATYWNEGO HTML <input> (#name-input-html
// w index.html) zamiast Phaser TextInput. Soft keyboard automatycznie na
// mobile, bez ukrytych inputów + workarounds.

import { GAME_WIDTH, GAME_HEIGHT, NAME_MAX_LENGTH } from '../config.js';
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
    // MP playerIndex>0: najpierw splash (NameSplashScene), potem wracamy ze
    // skipSplash=true. SP / pierwszy gracz wchodzą bezpośrednio.
    if (this.numPlayers > 1 && this.playerIndex > 0 && !this.skipSplash) {
      this.scene.start('NameSplashScene', {
        playerIndex: this.playerIndex,
        numPlayers: this.numPlayers,
      });
      return;
    }

    // Tło — pierwsza warstwa level1 z alpha + ciemny overlay.
    if (this.textures.exists('bg_level1_layer1')) {
      const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_level1_layer1');
      bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.4);
    }
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.55);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const title = this.numPlayers > 1
      ? `PLAYER ${this.playerIndex + 1} — wpisz imie`
      : 'WPISZ IMIE';
    this.add.text(GAME_WIDTH / 2, 120, title, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '44px',
      color: '#ffd93c',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 175, `A-Z 0-9 spacja, max ${NAME_MAX_LENGTH} znakow`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#bdaee3',
      stroke: '#000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    // Natywny HTML input z index.html.
    this.htmlInput = document.getElementById('name-input-html');
    if (this.htmlInput) {
      this.htmlInput.value = '';
      this.htmlInput.classList.add('active');
      // Mała chwila opóźnienia żeby DOM się zsynchronizował, potem focus
      // (mobile soft keyboard wstaje).
      this.focusTimeout = setTimeout(() => {
        try { this.htmlInput.focus(); } catch (e) { /* ignore */ }
      }, 100);

      this.enterListener = (e) => {
        if (e.key === 'Enter') this.confirmName();
      };
      this.htmlInput.addEventListener('keydown', this.enterListener);
    }

    // Przycisk POTWIERDZ (alternatywa dla Enter — szczególnie ważne na mobile).
    // y = GAME_HEIGHT - 140 = safe-zone (sesja 6.5).
    const btnY = GAME_HEIGHT - 140;
    const confirmBtn = this.add.text(GAME_WIDTH / 2, btnY, 'POTWIERDZ', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '36px',
      color: '#ffffff',
      backgroundColor: '#5C3E70',
      padding: { x: 28, y: 14 },
      stroke: '#ffe066',
      strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    confirmBtn.on('pointerdown', () => this.confirmName());

    // Cleanup przy shutdown — bez tego HTML input wisi z aktywną klasą.
    this.events.once('shutdown', () => this.cleanup());
  }

  confirmName() {
    if (!this.htmlInput) return;
    const raw = this.htmlInput.value || '';
    const sanitized = raw
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .slice(0, NAME_MAX_LENGTH)
      .trim();

    if (sanitized.length === 0) {
      this.cameras.main.shake(200, 0.01);
      return;
    }

    sessionManager.setName(this.playerIndex, sanitized);
    this.cleanup();

    if (this.playerIndex < this.numPlayers - 1) {
      this.scene.start('NameInputScene', {
        playerIndex: this.playerIndex + 1,
        numPlayers: this.numPlayers,
      });
    } else {
      this.scene.start('CharSelectScene');
    }
  }

  cleanup() {
    if (this.focusTimeout) {
      clearTimeout(this.focusTimeout);
      this.focusTimeout = null;
    }
    if (this.htmlInput) {
      try {
        this.htmlInput.classList.remove('active');
        if (this.enterListener) {
          this.htmlInput.removeEventListener('keydown', this.enterListener);
        }
        this.htmlInput.blur();
      } catch (e) { /* ignore */ }
      this.htmlInput = null;
      this.enterListener = null;
    }
  }
}
