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
import { StatsTracker } from '../utils/StatsTracker.js';
import { getWallet, getRankingScore, getCurrentLevel } from '../utils/storage.js';

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

    // DEV: ?boss=1..10|char02|char03 → skip do BossFightScene (test).
    // Numeryczne 1-10 mapuje na fromLevel → boss_bg_NN tło per boss.
    if (!MenuScene._bossApplied && typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      const bossParam = params.get('boss');
      if (bossParam) {
        MenuScene._bossApplied = true;
        const savedName = PlayerStore.getName() || 'TEST';
        sessionManager.setupSinglePlayer(savedName);
        sessionManager.setCharacter('char01');
        const explicit = ['char02', 'char03'].includes(bossParam) ? bossParam : null;
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

    // 4. Stat bars (placeholder) — top-left. Przesunięte w dół żeby zmieścić
    // PKT pill nad nimi (3-wierszowy stack: PKT / coins / diamonds).
    if (this.textures.exists('menu_stat_bars')) {
      this.add.image(150, 110, 'menu_stat_bars')
        .setDisplaySize(260, 130);
      const _wallet = getWallet();
      const _statTextStyle = {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        stroke: '#000',
        strokeThickness: 4,
      };
      this.add.text(160, 84, String(_wallet.coins ?? 0), _statTextStyle).setOrigin(0.5).setDepth(10);
      this.add.text(160, 138, String(_wallet.diamonds ?? 0), _statTextStyle).setOrigin(0.5).setDepth(10);

      // PKT pill — Phaser-drawn, styl matchujący baked menu_stat_bars
      // (rounded pill, czarne wnętrze, purple ramka). Pokazuje ranking_score.
      const _pktX = 150, _pktY = 30, _pktW = 240, _pktH = 38;
      const _pktBg = this.add.graphics().setDepth(8);
      _pktBg.fillStyle(0x140422, 0.95);
      _pktBg.fillRoundedRect(_pktX - _pktW / 2, _pktY - _pktH / 2, _pktW, _pktH, 19);
      _pktBg.lineStyle(3, 0x6b4ea0, 1);
      _pktBg.strokeRoundedRect(_pktX - _pktW / 2, _pktY - _pktH / 2, _pktW, _pktH, 19);
      this.add.text(_pktX - _pktW / 2 + 26, _pktY, 'PKT', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '16px',
        color: '#ffd93c',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0, 0.5).setDepth(10);
      this.add.text(_pktX + _pktW / 2 - 14, _pktY, String(getRankingScore()), {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        stroke: '#000',
        strokeThickness: 4,
      }).setOrigin(1, 0.5).setDepth(10);
    }

    // 5. Icons row (placeholder) — top-right.
    if (this.textures.exists('menu_icons_row')) {
      this.add.image(GAME_WIDTH - 200, 70, 'menu_icons_row')
        .setDisplaySize(360, 120);
    }

    // SKLEP button — image z death_screen mockup'a (sklep kiosk + "SKLEP").
    // Pozycja: centrowany pod sekcją diamentu w stat_bars (cały dolny bar).
    const shopBtnX = 150; // = stat_bars center X
    const shopBtnY = 205; // przesunięte z 175 — stat_bars przesunięte w dół o 35.
    const shopBtnW = 180;
    const shopBtnH = 50;
    if (this.textures.exists('menu_btn_shop')) {
      const shopBtn = this.add.image(shopBtnX, shopBtnY, 'menu_btn_shop').setDisplaySize(shopBtnW, shopBtnH);
      const baseScaleX = shopBtn.scaleX;
      const baseScaleY = shopBtn.scaleY;
      shopBtn.setInteractive({ useHandCursor: true });
      shopBtn.on('pointerover', () => shopBtn.setScale(baseScaleX * 1.05, baseScaleY * 1.05));
      shopBtn.on('pointerout', () => shopBtn.setScale(baseScaleX, baseScaleY));
      shopBtn.on('pointerup', () => {
        this.audioManager?.playSfx('click');
        this.scene.start('ShopScene');
      });
    } else {
      // Fallback Phaser graphics jeśli asset nie wczytany.
      const shopBg = this.add.rectangle(shopBtnX, shopBtnY, shopBtnW, shopBtnH, 0x3a1d5a, 0.95).setStrokeStyle(2, 0xffd93c);
      const shopLabel = this.add.text(shopBtnX, shopBtnY, '🛒 SKLEP', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '20px',
        color: '#ffd93c',
      }).setOrigin(0.5);
      shopBg.setInteractive({ useHandCursor: true });
      shopBg.on('pointerup', () => {
        this.audioManager?.playSfx('click');
        this.scene.start('ShopScene');
      });
    }

    // Settings — wykorzystujemy istniejącą zębatkę z baked menu_icons_row
    // (4 ikony: gift, trophy, gear, person; 360×120 na (GAME_WIDTH-200, 70)).
    // Gear = 3-cia z lewej. Pozycja w obrębie obrazka:
    //   image center X = GAME_WIDTH - 200 = 1080
    //   image szer = 360 → range x: 900 - 1260
    //   4 ikony równomiernie → środek 3-ciej = 900 + (360 * 5/8) = 1125
    //   środek Y = 70
    // Kładziemy invisible interactive zone nad nią + click → SettingsScene.
    const _gearHit = this.add.zone(1125, 70, 80, 80)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    _gearHit.on('pointerup', () => {
      this.audioManager?.playSfx('click');
      this.scene.start('SettingsScene');
    });

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
    // Source button image: 900×300 (3:1). Display zachowuje proporcje.
    const btnW = 390;
    const btnH = 130;

    this.buttons = [];
    const items = [];
    if (hasSave) {
      // Mid-game save istnieje (pauza→menu): KONTYNUUJ wraca do bieżącego levelu+score.
      items.push({ key: 'menu_btn_kontynuuj', action: 'continue' });
    } else {
      // Brak mid-game save: GRAJ. Start od `getCurrentLevel()` (highest unlocked
      // z game_currentLevel, syncowany do KV przez PlayerSync). Claim code recovery
      // mapuje na ten klucz — user na nowym urządzeniu po claim wraca tam gdzie był.
      // Reset progresu TYLKO przez Settings → Resetuj grę.
      items.push({ key: 'menu_btn_graj', action: 'play' });
    }
    items.push({ key: 'menu_btn_ranking', action: 'ranking' });

    const totalH = items.length * btnH + (items.length - 1) * 5;
    // Obniżenie sekcji od logo po usunięciu MULTI (offset 35 → 75 = +40px niżej).
    const startY = (GAME_HEIGHT - totalH) / 2 + btnH / 2 + 75;

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
        // 2026-05-13: GRAJ czyta highest unlocked. Drugi safeguard (poza BootScene):
        // await PlayerSync.initialLoad gdyby user kliknął zanim sync skończył się.
        FullscreenManager.enter();
        FullscreenManager.keepAwake();
        (async () => {
          if (window.__playerSyncReady) {
            try {
              await Promise.race([
                window.__playerSyncReady,
                new Promise((r) => setTimeout(r, 3000)),
              ]);
            } catch (_) { /* ignore */ }
          }
          GameStateStore.clear();
          sessionManager.reset();
          StatsTracker.track('gameStart', { mode: 'sp' });
          const savedName = PlayerStore.getName();
          sessionManager.setupSinglePlayer(savedName || '');
          // Set player.level do highest unlocked - 1 (level 0-indexed).
          const highestUnlocked = getCurrentLevel();
          sessionManager.currentPlayer().level = Math.max(0, highestUnlocked - 1);
          if (savedName) {
            this.scene.start('CharSelectScene');
          } else {
            this.scene.start('NameInputScene', { playerIndex: 0, numPlayers: 1 });
          }
        })();
        break;
      }
      case 'character': {
        // POSTAĆ button (wyświetlany gdy hasSave) — wybór postaci, start gry kontynuuj.
        FullscreenManager.enter();
        FullscreenManager.keepAwake();
        // NIE clear save'a — CharSelectScene użyje go po wyborze.
        const savedName = PlayerStore.getName();
        sessionManager.setupSinglePlayer(savedName || '');
        if (savedName) {
          this.scene.start('CharSelectScene', { resumeFromSave: true });
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
