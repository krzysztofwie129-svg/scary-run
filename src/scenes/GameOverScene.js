// GameOverScene — gracz stracił wszystkie życia (redesign 8.x).
// SP: RESTART (od L0) + MAIN MENU.
// MP: NEXT PLAYER / SHOW RESULTS + MAIN MENU.

import { GAME_WIDTH, GAME_HEIGHT, LEVELS } from '../config.js';
import { sessionManager } from '../utils/SessionManager.js';
import { Leaderboard } from '../utils/Leaderboard.js';
import { AudioManager } from '../utils/AudioManager.js';
import { StatsTracker } from '../utils/StatsTracker.js';
import { formatScore } from '../utils/format.js';
import { Haptic } from '../utils/Haptic.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init() {
    const player = sessionManager.currentPlayer();
    this.player = player;
    sessionManager.finishCurrentPlayer();

    StatsTracker.track('gameOver', {
      level: (player?.level ?? 0) + 1,
      score: Math.floor(player?.score || 0),
      coins: player?.coins || 0,
      diamonds: player?.diamonds || 0,
    });

    const localResult = Leaderboard._addLocal({
      name: player.name || 'Anon',
      score: Math.floor(player.score),
      level: player.level + 1,
      coins: player.coins,
    });
    this.rank = localResult.rank;
    this.isHighScore = this.rank >= 0;

    Leaderboard.addAsync({
      name: player.name || 'Anon',
      score: Math.floor(player.score),
      level: player.level + 1,
      coins: player.coins,
    }).catch(() => { /* fallback w środku */ });
  }

  create() {
    this.audioManager = new AudioManager(this);
    Haptic.gameOver();

    // BG (level1 layer + dark overlay).
    if (this.textures.exists('bg_layer_00')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_layer_00')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    }
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Title GAME OVER.
    if (this.textures.exists('gameover_title')) {
      this.add.image(GAME_WIDTH / 2, 130, 'gameover_title').setDisplaySize(540, 170);
    } else {
      this.add.text(GAME_WIDTH / 2, 130, 'GAME OVER', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '88px',
        color: '#ff6b6b',
        stroke: '#3a0a0a',
        strokeThickness: 8,
      }).setOrigin(0.5);
    }

    if (sessionManager.isMultiplayer) {
      this.add.text(GAME_WIDTH / 2, 230, `${this.player.name} (P${sessionManager.currentPlayerIndex + 1})`, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '28px',
        color: '#ffe066',
        stroke: '#000',
        strokeThickness: 4,
      }).setOrigin(0.5);
    }

    const labelY = sessionManager.isMultiplayer ? 280 : 250;

    // "Score:" label image + value text.
    if (this.textures.exists('gameover_label_score')) {
      this.add.image(GAME_WIDTH / 2 - 100, labelY, 'gameover_label_score').setDisplaySize(180, 60);
    } else {
      this.add.text(GAME_WIDTH / 2 - 100, labelY, 'Score:', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '40px',
        color: '#ffe066',
        stroke: '#000',
        strokeThickness: 5,
      }).setOrigin(0.5);
    }
    this.add.text(GAME_WIDTH / 2 + 80, labelY, formatScore(this.player.score), {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '52px',
      color: '#ffe066',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    // "Level reached:" label image + value.
    const lvlReached = Math.min(this.player.level + 1, LEVELS.length);
    if (this.textures.exists('gameover_label_level')) {
      this.add.image(GAME_WIDTH / 2 - 90, labelY + 70, 'gameover_label_level').setDisplaySize(220, 50);
    } else {
      this.add.text(GAME_WIDTH / 2 - 90, labelY + 70, 'Level reached:', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#bdaee3',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0.5);
    }
    this.add.text(GAME_WIDTH / 2 + 100, labelY + 70, `${lvlReached} / ${LEVELS.length}`, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '30px',
      color: '#bdaee3',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // High score banner (image-based for rank #1, text fallback for #2-#10).
    if (this.isHighScore) {
      if (this.rank === 0 && this.textures.exists('gameover_highscore')) {
        const hs = this.add.image(GAME_WIDTH / 2, labelY + 145, 'gameover_highscore').setDisplaySize(560, 80);
        this.tweens.add({
          targets: hs,
          scaleX: hs.scaleX * 1.06,
          scaleY: hs.scaleY * 1.06,
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      } else {
        const hs = this.add.text(GAME_WIDTH / 2, labelY + 145, `★ NEW HIGH SCORE — Rank #${this.rank + 1} ★`, {
          fontFamily: 'Arial Black, sans-serif',
          fontSize: '26px',
          color: '#ffd93c',
          stroke: '#000',
          strokeThickness: 4,
        }).setOrigin(0.5);
        this.tweens.add({ targets: hs, scale: 1.1, duration: 600, yoyo: true, repeat: -1 });
      }
    }

    // Buttons.
    const buttons = this.makeButtonsForFlow();
    this.bindKbNav(buttons);
  }

  makeImageButton(x, y, textureKey, w, h, onClick, fallbackLabel, fallbackColor) {
    if (this.textures.exists(textureKey)) {
      const btn = this.add.image(x, y, textureKey).setDisplaySize(w, h);
      const sx = btn.scaleX;
      const sy = btn.scaleY;
      btn.setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setScale(sx * 1.05, sy * 1.05));
      btn.on('pointerout', () => btn.setScale(sx, sy));
      btn.on('pointerdown', () => btn.setScale(sx * 0.95, sy * 0.95));
      btn.on('pointerup', () => { btn.setScale(sx, sy); onClick(); });
      return {
        onClick,
        setFocused(f) { btn.setScale(f ? sx * 1.05 : sx, f ? sy * 1.05 : sy); },
      };
    }
    return this.makeFallbackButton(x, y, fallbackLabel, fallbackColor, onClick);
  }

  makeButtonsForFlow() {
    const cy = GAME_HEIGHT - 130;
    const left = GAME_WIDTH / 2 - 200;
    const right = GAME_WIDTH / 2 + 200;
    const btnW = 340;
    const btnH = 90;

    if (sessionManager.isMultiplayer) {
      if (sessionManager.hasNextPlayer()) {
        return [
          this.makeFallbackButton(left, cy, 'NEXT PLAYER', 0x6b3eb6, () => {
            this.audioManager.playSfx('click');
            sessionManager.nextPlayer();
            this.scene.start('PlayerTurnSplashScene');
          }),
          this.makeImageButton(right, cy, 'gameover_btn_menu', btnW, btnH, () => {
            this.audioManager.playSfx('click');
            sessionManager.reset();
            this.scene.start('MenuScene');
          }, 'MAIN MENU', 0x3e6bb6),
        ];
      }
      return [
        this.makeFallbackButton(left, cy, 'SHOW RESULTS', 0x6b3eb6, () => {
          this.audioManager.playSfx('click');
          this.scene.start('SessionResultsScene');
        }),
        this.makeImageButton(right, cy, 'gameover_btn_menu', btnW, btnH, () => {
          this.audioManager.playSfx('click');
          sessionManager.reset();
          this.scene.start('MenuScene');
        }, 'MAIN MENU', 0x3e6bb6),
      ];
    }

    return [
      this.makeImageButton(left, cy, 'gameover_btn_restart', btnW, btnH, () => {
        this.audioManager.playSfx('click');
        sessionManager.restartCurrentPlayerFromLevel0();
        this.scene.start('GameScene');
      }, 'RESTART', 0x6b3eb6),
      this.makeImageButton(right, cy, 'gameover_btn_menu', btnW, btnH, () => {
        this.audioManager.playSfx('click');
        sessionManager.reset();
        this.scene.start('MenuScene');
      }, 'MAIN MENU', 0x3e6bb6),
    ];
  }

  makeFallbackButton(centerX, centerY, label, fillColor, onClick) {
    const w = 280;
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
      fontSize: '26px',
      color: '#fff',
    }).setOrigin(0.5);

    const hit = this.add.zone(centerX, centerY, w, h).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { draw(fillColor + 0x202020); text.setScale(1.05); });
    hit.on('pointerout', () => { draw(isFocused ? fillColor + 0x101010 : fillColor); text.setScale(isFocused ? 1.05 : 1); });
    hit.on('pointerup', onClick);

    return {
      onClick,
      setFocused(focused) {
        isFocused = focused;
        draw(focused ? fillColor + 0x101010 : fillColor);
        text.setScale(focused ? 1.05 : 1);
      },
    };
  }

  bindKbNav(buttons) {
    let idx = 0;
    const refresh = () => buttons.forEach((b, i) => b.setFocused?.(i === idx));
    refresh();
    const move = (delta) => { idx = (idx + delta + buttons.length) % buttons.length; refresh(); };
    this.input.keyboard?.on('keydown-LEFT', () => move(-1));
    this.input.keyboard?.on('keydown-A', () => move(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => move(1));
    this.input.keyboard?.on('keydown-D', () => move(1));
    this.input.keyboard?.on('keydown-SPACE', () => buttons[idx]?.onClick?.());
    this.input.keyboard?.on('keydown-ENTER', () => buttons[idx]?.onClick?.());
  }
}
