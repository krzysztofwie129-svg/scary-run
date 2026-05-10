// NameInputScene (sesja 7) — używa NATYWNEGO HTML <input> (#name-input-html
// w index.html) zamiast Phaser TextInput. Soft keyboard automatycznie na
// mobile, bez ukrytych inputów + workarounds.

import { GAME_WIDTH, GAME_HEIGHT, NAME_MAX_LENGTH } from '../config.js';
import { sessionManager } from '../utils/SessionManager.js';
import { PlayerStore } from '../utils/PlayerStore.js';

export class NameInputScene extends Phaser.Scene {
  constructor() {
    super({ key: 'NameInputScene' });
  }

  init(data) {
    this.playerIndex = data?.playerIndex ?? 0;
    this.numPlayers = data?.numPlayers ?? 1;
    this.skipSplash = data?.skipSplash === true;
    // Sesja Persistent Name: editMode=true → wraca do MenuScene (nie do gry).
    this.editMode = data?.editMode === true;
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

    // WRÓĆ button (lewy górny) → MenuScene. Asset shop_btn_back (ten sam co w DeathScene/Settings).
    if (this.textures.exists('shop_btn_back')) {
      const back = this.add.image(110, 50, 'shop_btn_back')
        .setDisplaySize(180, 60)
        .setDepth(99999)
        .setInteractive({ useHandCursor: true });
      back.on('pointerover', () => back.setScale(back.scaleX * 1.05, back.scaleY * 1.05));
      back.on('pointerout', () => back.setScale(back.scaleX / 1.05, back.scaleY / 1.05));
      back.on('pointerup', () => this.scene.start('MenuScene'));
    }

    // BG full-screen Halloween cemetery.
    if (this.textures.exists('nameinput_bg')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'nameinput_bg')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    } else if (this.textures.exists('bg_level1_layer1')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_level1_layer1')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.4);
      const overlay = this.add.graphics();
      overlay.fillStyle(0x000000, 0.55);
      overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // Title WPISZ IMIĘ — top center. W MP dodajemy small "GRACZ N" label nad
    // tytułem, sam tytuł zawsze image-based.
    if (this.textures.exists('nameinput_title')) {
      if (this.numPlayers > 1) {
        this.add.text(GAME_WIDTH / 2, 45, `GRACZ ${this.playerIndex + 1}`, {
          fontFamily: 'Arial Black, sans-serif',
          fontSize: '28px',
          color: '#bdaee3',
          stroke: '#000',
          strokeThickness: 4,
        }).setOrigin(0.5);
      }
      this.add.image(GAME_WIDTH / 2, 120, 'nameinput_title').setDisplaySize(420, 160);
    } else {
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
    }

    // Gold frame wokół HTML input (HTML input pozycjonowane CSS top:30% =
    // canvas y=216). Frame visual decoration — input text leży w środku.
    if (this.textures.exists('nameinput_frame')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT * 0.3, 'nameinput_frame')
        .setDisplaySize(520, 150);
    }

    // Hint text pod ramką.
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.3 + 110, `A-Z 0-9 spacja, max ${NAME_MAX_LENGTH} znakow`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#bdaee3',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Natywny HTML input z index.html.
    this.htmlInput = document.getElementById('name-input-html');
    if (this.htmlInput) {
      // Sesja Persistent Name: prefill w trybie edycji + dla Player 1 w MP.
      let prefill = '';
      if (this.editMode || (this.numPlayers > 1 && this.playerIndex === 0)) {
        prefill = PlayerStore.getName() || '';
      }
      this.htmlInput.value = prefill;
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

    // Przycisk KONTYNUUJ (image-based, gold frame + green BG + arrow).
    // y = GAME_HEIGHT - 180 — bottom safe-area iOS Safari (sesja 7.1) zjada
    // ~30-40px, więc -180 zapewnia widoczność klikalnej strefy.
    const btnY = GAME_HEIGHT - 180;
    let confirmBtn;
    if (this.textures.exists('nameinput_confirm')) {
      confirmBtn = this.add.image(GAME_WIDTH / 2, btnY, 'nameinput_confirm')
        .setDisplaySize(440, 110)
        .setInteractive({ useHandCursor: true });
      const baseScaleX = confirmBtn.scaleX;
      const baseScaleY = confirmBtn.scaleY;
      confirmBtn.on('pointerover', () => confirmBtn.setScale(baseScaleX * 1.05, baseScaleY * 1.05));
      confirmBtn.on('pointerout', () => confirmBtn.setScale(baseScaleX, baseScaleY));
      confirmBtn.on('pointerdown', () => confirmBtn.setScale(baseScaleX * 0.96, baseScaleY * 0.96));
      confirmBtn.on('pointerup', () => {
        confirmBtn.setScale(baseScaleX, baseScaleY);
        this.confirmName();
      });
    } else {
      confirmBtn = this.add.text(GAME_WIDTH / 2, btnY, 'POTWIERDZ', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '36px',
        color: '#ffffff',
        backgroundColor: '#5C3E70',
        padding: { x: 28, y: 14 },
        stroke: '#ffe066',
        strokeThickness: 3,
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      confirmBtn.on('pointerdown', () => this.confirmName());
    }

    // Backup tap zone — gdy przycisk POTWIERDZ jest poza viewportem (Safari
    // tab bar) lub stacking conflict z htmlInput, gracz wciąż może potwierdzić
    // tappując dolne 200px ekranu poza polem inputa.
    const backupZone = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 60,
      GAME_WIDTH,
      200,
      0x000000,
      0,
    ).setInteractive().setDepth(99997);
    backupZone.on('pointerdown', () => this.confirmName());

    // Cleanup przy shutdown — bez tego HTML input wisi z aktywną klasą.
    this.events.once('shutdown', () => this.cleanup());
  }

  confirmName() {
    // Pobierz value direct z DOM (race-safe — htmlInput może być w trakcie
    // input event). Jeśli już cleanup'owane, htmlInput == null, return.
    if (!this.htmlInput) return;
    const raw = (this.htmlInput.value || '').trim();
    const sanitized = raw
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .slice(0, NAME_MAX_LENGTH)
      .trim();

    if (sanitized.length === 0) {
      this.cameras.main.shake(200, 0.01);
      // Re-focus żeby user wpisał coś — soft keyboard nie zamyka się.
      setTimeout(() => {
        try { this.htmlInput?.focus(); } catch (e) { /* ignore */ }
      }, 100);
      return;
    }

    sessionManager.setName(this.playerIndex, sanitized);
    // Persistuj imię TYLKO gdy: single mode, edit z menu, lub Player 1 MP
    // (P2/P3/P4 to dodatkowe imiona w sesji — nie nadpisują głównego usera).
    if (this.numPlayers === 1 || this.editMode || (this.numPlayers > 1 && this.playerIndex === 0)) {
      PlayerStore.saveName(sanitized);
    }
    this.cleanup();

    if (this.editMode) {
      // Zmiana z menu — wracamy do MenuScene, NIE do gry.
      this.scene.start('MenuScene');
      return;
    }

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
