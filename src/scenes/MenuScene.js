// MenuScene — entry point. Tytuł + 3 przyciski: START GAME (SP),
// MULTIPLAYER (2-4 graczy), LEADERBOARD. Muzyka menu w tle.
// Wybór postaci wydzielony do CharSelectScene (po NameInputScene).

import {
  GAME_WIDTH,
  GAME_HEIGHT,
  MAX_PLAYERS,
} from '../config.js';
import { AudioManager } from '../utils/AudioManager.js';
import { sessionManager } from '../utils/SessionManager.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.audioManager = new AudioManager(this);
    // Bez loop — odtwarza raz i kończy. Trim 15s i tak nie poprawił czasu
    // ładowania, więc nie ma sensu zapętlać krótkiego klipu.
    this.audioManager.playMusic('music_menu', 0.4, false);

    // Tło: layer_00 z tileset/background.
    if (this.textures.exists('bg_layer_00')) {
      const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_layer_00');
      bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    }

    this.add.text(GAME_WIDTH / 2, 100, 'SCARY RUN', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '96px',
      color: '#ffe066',
      stroke: '#3a1d5a',
      strokeThickness: 8,
      shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 16, fill: true },
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 180, 'Halloween Endless Runner', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#bdaee3',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // Stan menu — main lub multiplayer-count.
    this.menuState = 'main';
    this.buildMainButtons();

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 20, '↑ ↓ wybór · ENTER / SPACE zatwierdź', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#bdaee3',
    }).setOrigin(0.5);
  }

  destroyButtons() {
    if (this.buttons) {
      for (const b of this.buttons) b.destroy?.();
    }
    this.buttons = [];
    this.focusedIndex = 0;
    if (this.kbHandlers) {
      for (const off of this.kbHandlers) off();
    }
    this.kbHandlers = [];
  }

  buildMainButtons() {
    this.menuState = 'main';
    this.destroyButtons();

    const cy = GAME_HEIGHT / 2;
    this.buttons = [
      this.makeButton(GAME_WIDTH / 2, cy - 40, 'START GAME', 0x6b3eb6, () => {
        this.audioManager?.playSfx('click');
        sessionManager.setupSinglePlayer('');
        this.scene.start('NameInputScene', { playerIndex: 0, numPlayers: 1 });
      }),
      this.makeButton(GAME_WIDTH / 2, cy + 50, 'MULTIPLAYER', 0x3e6bb6, () => {
        this.audioManager?.playSfx('click');
        this.buildPlayerCountButtons();
      }),
      this.makeButton(GAME_WIDTH / 2, cy + 140, 'LEADERBOARD', 0x4ad8ff, () => {
        this.audioManager?.playSfx('click');
        this.scene.start('LeaderboardScene');
      }),
    ];
    this.bindKeyboardNav();
  }

  buildPlayerCountButtons() {
    this.menuState = 'mp_count';
    this.destroyButtons();

    const cy = GAME_HEIGHT / 2 - 30;
    this.add.text(GAME_WIDTH / 2, cy - 60, 'How many players?', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '32px',
      color: '#ffe066',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setName('mp_prompt');

    this.buttons = [];
    for (let n = 2; n <= MAX_PLAYERS; n++) {
      const idx = n - 2;
      this.buttons.push(
        this.makeButton(GAME_WIDTH / 2, cy + 30 + idx * 70, `${n} PLAYERS`, 0x6b3eb6, () => {
          this.audioManager?.playSfx('click');
          sessionManager.setupMultiplayer(n);
          this.scene.start('NameInputScene', { playerIndex: 0, numPlayers: n });
        }),
      );
    }
    this.buttons.push(
      this.makeButton(GAME_WIDTH / 2, cy + 30 + (MAX_PLAYERS - 1) * 70, 'BACK', 0x4a4a6a, () => {
        this.audioManager?.playSfx('click');
        const prompt = this.children.getByName('mp_prompt');
        if (prompt) prompt.destroy();
        this.buildMainButtons();
      }),
    );
    this.bindKeyboardNav();
  }

  bindKeyboardNav() {
    this.focusedIndex = 0;
    this.refreshFocus();
    const move = (delta) => {
      this.focusedIndex = (this.focusedIndex + delta + this.buttons.length) % this.buttons.length;
      this.refreshFocus();
    };
    const onUp = () => move(-1);
    const onDown = () => move(1);
    const onActivate = () => this.buttons[this.focusedIndex]?.onClick();

    this.input.keyboard.on('keydown-UP', onUp);
    this.input.keyboard.on('keydown-W', onUp);
    this.input.keyboard.on('keydown-DOWN', onDown);
    this.input.keyboard.on('keydown-S', onDown);
    this.input.keyboard.on('keydown-SPACE', onActivate);
    this.input.keyboard.on('keydown-ENTER', onActivate);

    this.kbHandlers = [
      () => this.input.keyboard.off('keydown-UP', onUp),
      () => this.input.keyboard.off('keydown-W', onUp),
      () => this.input.keyboard.off('keydown-DOWN', onDown),
      () => this.input.keyboard.off('keydown-S', onDown),
      () => this.input.keyboard.off('keydown-SPACE', onActivate),
      () => this.input.keyboard.off('keydown-ENTER', onActivate),
    ];
  }

  refreshFocus() {
    this.buttons?.forEach((b, i) => b.setFocused?.(i === this.focusedIndex));
  }

  makeButton(centerX, centerY, label, fillColor, onClick) {
    const w = 320;
    const h = 70;
    const x = centerX - w / 2;
    const y = centerY - h / 2;

    const gfx = this.add.graphics();
    let isFocused = false;
    const draw = (fill) => {
      gfx.clear();
      gfx.fillStyle(fill, 1);
      gfx.fillRoundedRect(x, y, w, h, 16);
      gfx.lineStyle(isFocused ? 6 : 3, 0xffe066, 1);
      gfx.strokeRoundedRect(x, y, w, h, 16);
    };
    draw(fillColor);

    const text = this.add.text(centerX, centerY, label, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '28px',
      color: '#fff',
    }).setOrigin(0.5);

    const hit = this.add.zone(centerX, centerY, w, h).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { draw(fillColor + 0x202020); text.setScale(1.05); });
    hit.on('pointerout', () => { draw(isFocused ? fillColor + 0x101010 : fillColor); text.setScale(isFocused ? 1.05 : 1); });
    hit.on('pointerdown', () => draw(fillColor - 0x202020));
    hit.on('pointerup', onClick);

    return {
      onClick,
      setFocused(focused) {
        isFocused = focused;
        draw(focused ? fillColor + 0x101010 : fillColor);
        text.setScale(focused ? 1.05 : 1);
      },
      destroy() {
        gfx.destroy();
        text.destroy();
        hit.destroy();
      },
    };
  }
}
