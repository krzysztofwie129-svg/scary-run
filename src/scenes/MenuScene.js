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
import { isMobileDevice } from '../utils/DeviceDetect.js';
import { GameStateStore } from '../utils/GameStateStore.js';
import { FullscreenManager } from '../utils/FullscreenManager.js';
import { InstallPromptManager } from '../utils/InstallPromptManager.js';
import { PlayerStore } from '../utils/PlayerStore.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    // DEV: ?chest=random|giant|destroyer → skip menu, idź prosto do ChestSelect
    // (z forceRewards=3× wybrana nagroda). Po KONTYNUUJ start GameScene
    // (level z ?level=N lub 0). Aplikuj raz na page load.
    // DEV: ?boss=1|char02|char03 → skip do BossFightScene (test).
    if (!MenuScene._bossApplied && typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      const bossParam = params.get('boss');
      if (bossParam) {
        MenuScene._bossApplied = true;
        const savedName = PlayerStore.getName() || 'TEST';
        sessionManager.setupSinglePlayer(savedName);
        sessionManager.setCharacter('char01');
        const explicit = ['char02', 'char03'].includes(bossParam) ? bossParam : null;
        // Numeryczny ?boss=N (1-10) → fromLevel=N → boss_bg_NN tło per boss.
        const numeric = parseInt(bossParam, 10);
        const fromLevel = Number.isFinite(numeric) && numeric >= 1 ? numeric : 1;
        this.scene.start('BossFightScene', {
          fromLevel,
          bossCharKey: explicit,
        });
        return;
      }
    }

    if (!MenuScene._chestApplied && typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      const chestParam = params.get('chest');
      if (chestParam) {
        MenuScene._chestApplied = true;
        const map = {
          random: null,
          giant: 'next_giant',
          destroyer: 'next_destroyer',
        };
        const forced = map[chestParam.toLowerCase()];
        // Setup minimum sessionManager: SP + char01 + level z URL.
        const savedName = PlayerStore.getName() || 'TEST';
        sessionManager.setupSinglePlayer(savedName);
        sessionManager.setCharacter('char01');
        const lvlParam = parseInt(params.get('level'), 10);
        if (Number.isFinite(lvlParam) && lvlParam >= 1) {
          sessionManager.currentPlayer().level = lvlParam - 1;
        }
        const forceRewards = forced ? [forced, forced, forced] : null;
        // Random nie wymaga forceRewards — ChestSelect sam wylosuje 3 różne.
        this.scene.start('ChestSelectScene', {
          nextScene: 'GameScene',
          forceRewards,
        });
        return;
      }
    }

    // Muzyka menu wyłączona (sesja 7.1).
    this.audioManager = new AudioManager(this);
    // Audio unlock dla mobile — KLUCZOWE dla SFX. iOS Safari autoplay policy
    // wymaga pierwszej próby play() na user gesture żeby odblokować audio
    // dla całej strony. Wcześniejsza wersja używała playMusic('music_menu')
    // jako "ofiarne" play żeby unlock — po wyłączeniu muzyki SFX przestały
    // grać. Tu używamy this.sound.unlock() który robi to samo bez słyszalnego
    // dźwięku (silent buffer pod spodem).
    if (this.sound.locked) {
      this.input.once('pointerdown', () => {
        try { this.sound.unlock(); } catch (e) { /* ignore */ }
        try { this.sound.context?.resume(); } catch (e) { /* ignore */ }
      });
    }

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

    // Sesja Persistent Name — greeting + ikona edycji jeśli imię zapisane.
    this.buildGreeting();

    // Stan menu — main lub multiplayer-count.
    this.menuState = 'main';
    this.buildMainButtons();

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 20, 'Tap aby wybrac', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#bdaee3',
    }).setOrigin(0.5);

    if (isMobileDevice()) {
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50, 'Tap GORA aby skoczyc  •  Tap DOL aby slizgac', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#ffd93c',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(10000);
    }

    // Sesja P3.1: install prompt dla iPhone Safari (raz, jeśli nie zamknięty).
    // 1s delay żeby najpierw było widoczne menu.
    if (InstallPromptManager.shouldShow()) {
      this.time.delayedCall(1000, () => {
        this.scene.launch('InstallPromptScene');
      });
    }
  }

  buildGreeting() {
    const savedName = PlayerStore.getName();
    if (!savedName) return;

    // y=230 — pod subtitle (180), nad CONTINUE/START (cy=290+).
    const y = 230;
    const greeting = this.add.text(GAME_WIDTH / 2 - 30, y, `Czesc, ${savedName}!`, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '28px',
      color: '#ffd93c',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // ✏️ klikalny — edit mode prowadzi do NameInput, potem wraca tu.
    const editIcon = this.add.text(greeting.x + greeting.width / 2 + 22, y, '✏️', {
      fontSize: '26px',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    editIcon.on('pointerover', () => editIcon.setScale(1.2));
    editIcon.on('pointerout', () => editIcon.setScale(1.0));
    editIcon.on('pointerup', () => {
      this.audioManager?.playSfx('click');
      this.scene.start('NameInputScene', {
        editMode: true,
        playerIndex: 0,
        numPlayers: 1,
      });
    });
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
    const hasSave = GameStateStore.hasSave();
    // Layout: jeśli save istnieje, dodajemy CONTINUE jako pierwszy
    // i przesuwamy resztę w dół o 90px (mieszczą się w safe-zone GAME_HEIGHT-180).
    const offset = hasSave ? 90 : 0;

    this.buttons = [];
    if (hasSave) {
      this.buttons.push(
        this.makeButton(GAME_WIDTH / 2, cy - 130, '▶ KONTYNUUJ', 0xffd93c, () => {
          this.audioManager?.playSfx('click');
          FullscreenManager.enter();
          FullscreenManager.keepAwake();
          this.continueGame();
        }),
      );
    }
    this.buttons.push(
      this.makeButton(GAME_WIDTH / 2, cy - 40 + offset, 'START GAME', 0x6b3eb6, () => {
        this.audioManager?.playSfx('click');
        FullscreenManager.enter();
        FullscreenManager.keepAwake();
        // Klik START GAME → świadomy nowy start, clear istniejącego save'a.
        GameStateStore.clear();
        // Sesja Persistent Name: jeśli imię już zapisane → pomijamy NameInput,
        // od razu CharSelect (klasyczny mobile UX, Subway Surfers style).
        const savedName = PlayerStore.getName();
        sessionManager.setupSinglePlayer(savedName || '');
        if (savedName) {
          this.scene.start('CharSelectScene');
        } else {
          this.scene.start('NameInputScene', { playerIndex: 0, numPlayers: 1 });
        }
      }),
      this.makeButton(GAME_WIDTH / 2, cy + 50 + offset, 'MULTIPLAYER', 0x3e6bb6, () => {
        this.audioManager?.playSfx('click');
        FullscreenManager.enter();
        FullscreenManager.keepAwake();
        GameStateStore.clear();
        this.buildPlayerCountButtons();
      }),
      this.makeButton(GAME_WIDTH / 2, cy + 140 + offset, 'LEADERBOARD', 0x4ad8ff, () => {
        this.audioManager?.playSfx('click');
        this.scene.start('LeaderboardScene');
      }),
    );
    this.bindKeyboardNav();
  }

  buildPlayerCountButtons() {
    this.menuState = 'mp_count';
    this.destroyButtons();

    // Shift cy 40px up (sesja 7.1) — żeby BACK wylądował w safe-zone iOS
    // bottom. Spacing player buttons zmniejszony do 60px (z 70) żeby zrobić
    // miejsce na większy BACK + extra gap (sesja P3.1+).
    const cy = GAME_HEIGHT / 2 - 70;
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
    // BACK osobno — większy gap (90px zamiast 70) + większy rozmiar (380x84,
    // font 32) żeby wizualnie odseparować od listy "N PLAYERS" (user request).
    const lastPlayerY = cy + 30 + (MAX_PLAYERS - 2) * 70;
    this.buttons.push(
      this.makeButton(GAME_WIDTH / 2, lastPlayerY + 90, 'BACK', 0x4a4a6a, () => {
        this.audioManager?.playSfx('click');
        const prompt = this.children.getByName('mp_prompt');
        if (prompt) prompt.destroy();
        this.buildMainButtons();
      }, { w: 380, h: 84, fontSize: '32px' }),
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

    this.input.keyboard?.on('keydown-UP', onUp);
    this.input.keyboard?.on('keydown-W', onUp);
    this.input.keyboard?.on('keydown-DOWN', onDown);
    this.input.keyboard?.on('keydown-S', onDown);
    this.input.keyboard?.on('keydown-SPACE', onActivate);
    this.input.keyboard?.on('keydown-ENTER', onActivate);

    this.kbHandlers = [
      () => this.input.keyboard?.off('keydown-UP', onUp),
      () => this.input.keyboard?.off('keydown-W', onUp),
      () => this.input.keyboard?.off('keydown-DOWN', onDown),
      () => this.input.keyboard?.off('keydown-S', onDown),
      () => this.input.keyboard?.off('keydown-SPACE', onActivate),
      () => this.input.keyboard?.off('keydown-ENTER', onActivate),
    ];
  }

  refreshFocus() {
    this.buttons?.forEach((b, i) => b.setFocused?.(i === this.focusedIndex));
  }

  /** Sesja P1 — odtwarza stan z localStorage i przechodzi prosto do GameScene
   *  (postać i imię już z save'a, NameInput/CharSelect pominięte). */
  continueGame() {
    const data = GameStateStore.load();
    if (!data) {
      // Save zniknął między pokazaniem buttona a kliknięciem (TTL?). Restart menu.
      this.scene.restart();
      return;
    }
    if (!sessionManager.deserialize(data.session)) {
      // Malformed save — clear i refresh.
      GameStateStore.clear();
      this.scene.restart();
      return;
    }
    if (typeof data.currentLevel === 'number') {
      sessionManager.currentPlayer().level = data.currentLevel;
    }
    this.scene.start('GameScene');
  }

  makeButton(centerX, centerY, label, fillColor, onClick, opts = {}) {
    const w = opts.w ?? 320;
    const h = opts.h ?? 70;
    const fontSize = opts.fontSize ?? '28px';
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
      fontSize,
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
