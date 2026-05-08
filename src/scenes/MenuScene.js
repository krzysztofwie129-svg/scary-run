// MenuScene — entry point. Halloween Night layout (sesja 8.x):
//   • full-screen BG (menu_bg)
//   • Scary Run logo (menu_logo)
//   • 4 image buttons KONTYNUUJ/GRAJ/MULTI/RANKING (menu_btn_*)
//   • demon character decoration (menu_demon)
//   • placeholder UI: stat bars top-left, icons row top-right
//   • "Tap przycisk..." tekst u dołu (menu_tap_text)
//
// Stat bars + 4 round icons to placeholdery wizualne (per user — diamenty,
// konto, gear nie mają jeszcze logiki).

import {
  GAME_WIDTH,
  GAME_HEIGHT,
  MAX_PLAYERS,
} from '../config.js';
import { AudioManager } from '../utils/AudioManager.js';
import { sessionManager } from '../utils/SessionManager.js';
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
    // DEV: ?levelcomplete=N → skip do LevelCompleteScene z mock data dla level N.
    if (!MenuScene._lcApplied && typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      const lcParam = params.get('levelcomplete');
      if (lcParam) {
        MenuScene._lcApplied = true;
        const lvl = Math.max(1, parseInt(lcParam, 10) || 1);
        sessionManager.setupSinglePlayer('TEST');
        sessionManager.setCharacter('char01');
        const p = sessionManager.currentPlayer();
        p.level = lvl - 1;
        p.lives = 5;
        p.coins = 20;
        p.diamonds = 4;
        this.scene.start('LevelCompleteScene', {
          deathsThisLevel: 0,
          timeRemainingPercent: 0.6,
          scoreThisLevel: 894,
          coinsThisLevel: 20,
          diamondsThisLevel: 4,
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
        const savedName = PlayerStore.getName() || 'TEST';
        sessionManager.setupSinglePlayer(savedName);
        sessionManager.setCharacter('char01');
        const lvlParam = parseInt(params.get('level'), 10);
        if (Number.isFinite(lvlParam) && lvlParam >= 1) {
          sessionManager.currentPlayer().level = lvlParam - 1;
        }
        const forceRewards = forced ? [forced, forced, forced] : null;
        this.scene.start('ChestSelectScene', {
          nextScene: 'GameScene',
          forceRewards,
        });
        return;
      }
    }

    this.audioManager = new AudioManager(this);
    // iOS audio unlock — pierwszy pointerdown.
    if (this.sound.locked) {
      this.input.once('pointerdown', () => {
        try { this.sound.unlock(); } catch (e) { /* ignore */ }
        try { this.sound.context?.resume(); } catch (e) { /* ignore */ }
      });
    }

    // 1. Full-screen background.
    if (this.textures.exists('menu_bg')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'menu_bg')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    } else if (this.textures.exists('bg_layer_00')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_layer_00')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    }

    // 2. Demon decoration (prawa strona, lekko za przyciskami).
    if (this.textures.exists('menu_demon')) {
      this.add.image(GAME_WIDTH - 160, GAME_HEIGHT / 2 + 90, 'menu_demon')
        .setDisplaySize(320, 320);
    }

    // 3. Logo — top-center.
    if (this.textures.exists('menu_logo')) {
      this.add.image(GAME_WIDTH / 2, 150, 'menu_logo')
        .setDisplaySize(540, 180);
    }

    // 4. Stat bars (placeholder) — top-left.
    if (this.textures.exists('menu_stat_bars')) {
      this.add.image(150, 75, 'menu_stat_bars')
        .setDisplaySize(260, 130);
    }

    // 5. Icons row (placeholder) — top-right.
    if (this.textures.exists('menu_icons_row')) {
      this.add.image(GAME_WIDTH - 200, 70, 'menu_icons_row')
        .setDisplaySize(360, 120);
    }

    // Build buttons (zależnie od hasSave).
    this.menuState = 'main';
    this.buildMainButtons();

    // 6. Tap text u dołu.
    if (this.textures.exists('menu_tap_text')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT - 28, 'menu_tap_text')
        .setDisplaySize(440, 90);
    }

    // 7. Install prompt (iOS).
    if (InstallPromptManager.shouldShow()) {
      this.time.delayedCall(1000, () => {
        this.scene.launch('InstallPromptScene');
      });
    }
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

    const hasSave = GameStateStore.hasSave();
    const cx = GAME_WIDTH / 2;
    // 4 przyciski: y=320, 420, 520, 620 (gdy hasSave); 3: y=380, 490, 600.
    // Ratio button image source: 900x300 = 3:1. Display 460×100 → lekkie
    // squashy ale akceptowalne (~5:1 jak w wizji).
    const btnW = 520;
    const btnH = 100;

    this.buttons = [];
    const items = [];
    if (hasSave) items.push({ key: 'menu_btn_kontynuuj', action: 'continue' });
    items.push({ key: 'menu_btn_graj', action: 'play' });
    items.push({ key: 'menu_btn_multi', action: 'multi' });
    items.push({ key: 'menu_btn_ranking', action: 'ranking' });

    const totalH = items.length * btnH + (items.length - 1) * 5;
    const startY = (GAME_HEIGHT - totalH) / 2 + btnH / 2 + 35;

    items.forEach((item, idx) => {
      const cy = startY + idx * (btnH + 5);
      this.buttons.push(this.makeImageButton(cx, cy, item.key, btnW, btnH, () => {
        this.audioManager?.playSfx('click');
        this.handleButtonAction(item.action);
      }));
    });

    this.bindKeyboardNav();
  }

  handleButtonAction(action) {
    switch (action) {
      case 'continue': {
        FullscreenManager.enter();
        FullscreenManager.keepAwake();
        this.continueGame();
        break;
      }
      case 'play': {
        FullscreenManager.enter();
        FullscreenManager.keepAwake();
        GameStateStore.clear();
        const savedName = PlayerStore.getName();
        sessionManager.setupSinglePlayer(savedName || '');
        if (savedName) {
          this.scene.start('CharSelectScene');
        } else {
          this.scene.start('NameInputScene', { playerIndex: 0, numPlayers: 1 });
        }
        break;
      }
      case 'multi': {
        FullscreenManager.enter();
        FullscreenManager.keepAwake();
        GameStateStore.clear();
        this.buildPlayerCountButtons();
        break;
      }
      case 'ranking': {
        this.scene.start('LeaderboardScene');
        break;
      }
      default: break;
    }
  }

  buildPlayerCountButtons() {
    this.menuState = 'mp_count';
    this.destroyButtons();

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
        this.makeFallbackButton(GAME_WIDTH / 2, cy + 30 + idx * 70, `${n} PLAYERS`, 0x6b3eb6, () => {
          this.audioManager?.playSfx('click');
          sessionManager.setupMultiplayer(n);
          this.scene.start('NameInputScene', { playerIndex: 0, numPlayers: n });
        }),
      );
    }
    const lastPlayerY = cy + 30 + (MAX_PLAYERS - 2) * 70;
    this.buttons.push(
      this.makeFallbackButton(GAME_WIDTH / 2, lastPlayerY + 90, 'BACK', 0x4a4a6a, () => {
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

  /** Sesja P1 — odtwarza stan z localStorage i przechodzi prosto do GameScene. */
  continueGame() {
    const data = GameStateStore.load();
    if (!data) {
      this.scene.restart();
      return;
    }
    if (!sessionManager.deserialize(data.session)) {
      GameStateStore.clear();
      this.scene.restart();
      return;
    }
    if (typeof data.currentLevel === 'number') {
      sessionManager.currentPlayer().level = data.currentLevel;
    }
    this.scene.start('GameScene');
  }

  /** Image-based button — używa textury menu_btn_*. Hit area = setInteractive
   *  na obrazku. Focus highlight = scale 1.05. */
  makeImageButton(centerX, centerY, textureKey, w, h, onClick) {
    const img = this.add.image(centerX, centerY, textureKey).setDisplaySize(w, h);
    img.setInteractive({ useHandCursor: true });
    let isFocused = false;
    const baseScaleX = img.scaleX;
    const baseScaleY = img.scaleY;

    const apply = (focusedOrHover) => {
      const k = focusedOrHover ? 1.05 : 1;
      img.scaleX = baseScaleX * k;
      img.scaleY = baseScaleY * k;
    };

    img.on('pointerover', () => apply(true));
    img.on('pointerout', () => apply(isFocused));
    img.on('pointerdown', () => {
      img.scaleX = baseScaleX * 0.97;
      img.scaleY = baseScaleY * 0.97;
    });
    img.on('pointerup', () => {
      apply(isFocused);
      onClick();
    });

    return {
      onClick,
      setFocused(focused) {
        isFocused = focused;
        apply(focused);
      },
      destroy() {
        img.destroy();
      },
    };
  }

  /** Fallback button — Phaser graphics + text. Używany w mp_count gdzie nie
   *  mamy gotowych grafik dla "2 PLAYERS"/"BACK" itd. */
  makeFallbackButton(centerX, centerY, label, fillColor, onClick, opts = {}) {
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
