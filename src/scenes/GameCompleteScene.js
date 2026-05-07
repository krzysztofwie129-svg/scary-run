// GameCompleteScene — gracz ukończył wszystkie 4 levele.
// Save do leaderboard z level=ALL (LEVELS.length). MP: NEXT PLAYER lub SHOW RESULTS.

import {
  GAME_WIDTH,
  GAME_HEIGHT,
  HI_TOTAL_SCORE_KEY,
  LEVELS,
} from '../config.js';
import { AudioManager } from '../utils/AudioManager.js';
import { playFanfare } from '../utils/SuccessFanfare.js';
import { sessionManager } from '../utils/SessionManager.js';
import { Leaderboard } from '../utils/Leaderboard.js';
import { formatScore } from '../utils/format.js';

const SPARK_KEY = '__spark_4x4';

export class GameCompleteScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameCompleteScene' });
  }

  init() {
    this.player = sessionManager.currentPlayer();
    sessionManager.finishCurrentPlayer();

    // Leaderboard z level = LEVELS.length (czyli "ALL").
    this.rank = Leaderboard.add({
      name: this.player.name || 'Anon',
      score: Math.floor(this.player.score),
      level: LEVELS.length,
      coins: this.player.coins,
    });
    this.isHighScore = this.rank >= 0;

    // Hi-total-score legacy.
    const raw = localStorage.getItem(HI_TOTAL_SCORE_KEY);
    const prev = Number.parseInt(raw ?? '0', 10);
    this.previousHiTotal = Number.isFinite(prev) ? prev : 0;
    if (Math.floor(this.player.score) > this.previousHiTotal) {
      localStorage.setItem(HI_TOTAL_SCORE_KEY, String(Math.floor(this.player.score)));
    }
  }

  create() {
    this.audioManager = new AudioManager(this);

    if (this.textures.exists('bg_layer_00')) {
      const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_layer_00');
      bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    }
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.65);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add.text(GAME_WIDTH / 2, 130, 'GAME COMPLETE! 🏆', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '72px',
      color: '#ffd93c',
      stroke: '#000',
      strokeThickness: 8,
      shadow: { offsetX: 2, offsetY: 4, color: '#000', blur: 16, fill: true },
    }).setOrigin(0.5);

    const subY = 200;
    if (sessionManager.isMultiplayer) {
      this.add.text(GAME_WIDTH / 2, subY, this.player.name, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '32px',
        color: '#ffe066',
        stroke: '#000',
        strokeThickness: 4,
      }).setOrigin(0.5);
    } else {
      this.add.text(GAME_WIDTH / 2, subY, 'You beat all 4 levels!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '28px',
        color: '#bdaee3',
        fontStyle: 'italic',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0.5);
    }

    const labelStyle = {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '32px',
      color: '#ffe066',
      stroke: '#000',
      strokeThickness: 5,
    };
    let y = 280;
    this.makeAnimatedStat(GAME_WIDTH / 2, y, '🪙 Total coins:', this.player.coins, labelStyle); y += 50;
    this.makeAnimatedStat(GAME_WIDTH / 2, y, '💎 Total diamonds:', this.player.diamonds, labelStyle); y += 50;
    this.makeAnimatedStat(GAME_WIDTH / 2, y, '⭐ Final score:', Math.floor(this.player.score), labelStyle, true);

    if (this.isHighScore) {
      const hs = this.add.text(GAME_WIDTH / 2, y + 60, `★ NEW HIGH SCORE — Rank #${this.rank + 1} ★`, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '28px',
        color: '#ffd93c',
        stroke: '#000',
        strokeThickness: 4,
      }).setOrigin(0.5);
      this.tweens.add({ targets: hs, scale: 1.1, duration: 600, yoyo: true, repeat: -1 });
    }

    // Buttons depending on flow.
    const buttons = this.makeButtons();
    this.bindKbNav(buttons);

    this.spawnConfetti();
    playFanfare();
    this.time.delayedCall(800, () => playFanfare());
  }

  makeButtons() {
    const cy = GAME_HEIGHT - 140;
    const left = GAME_WIDTH / 2 - 180;
    const right = GAME_WIDTH / 2 + 180;

    if (sessionManager.isMultiplayer) {
      if (sessionManager.hasNextPlayer()) {
        return [
          this.makeButton(left, cy, 'NEXT PLAYER', 0x6b3eb6, () => {
            this.audioManager.playSfx('click');
            sessionManager.nextPlayer();
            this.scene.start('PlayerTurnSplashScene');
          }),
          this.makeButton(right, cy, 'MAIN MENU', 0x3e6bb6, () => {
            this.audioManager.playSfx('click');
            sessionManager.reset();
            this.scene.start('MenuScene');
          }),
        ];
      }
      return [
        this.makeButton(left, cy, 'SHOW RESULTS', 0x6b3eb6, () => {
          this.audioManager.playSfx('click');
          this.scene.start('SessionResultsScene');
        }),
        this.makeButton(right, cy, 'MAIN MENU', 0x3e6bb6, () => {
          this.audioManager.playSfx('click');
          sessionManager.reset();
          this.scene.start('MenuScene');
        }),
      ];
    }

    return [
      this.makeButton(left, cy, 'PLAY AGAIN', 0x6b3eb6, () => {
        this.audioManager.playSfx('click');
        // Reset stats + level=0, ten sam gracz, ta sama postać.
        const player = sessionManager.currentPlayer();
        player.score = 0;
        player.coins = 0;
        player.diamonds = 0;
        player.level = 0;
        player.lives = 3;
        player.finished = false;
        this.scene.start('GameScene');
      }),
      this.makeButton(right, cy, 'MAIN MENU', 0x3e6bb6, () => {
        this.audioManager.playSfx('click');
        sessionManager.reset();
        this.scene.start('MenuScene');
      }),
    ];
  }

  makeAnimatedStat(x, y, label, finalValue, style, useScoreFormat = false) {
    const fmt = useScoreFormat
      ? (v) => formatScore(v)
      : (v) => Math.floor(v).toString();
    const text = this.add.text(x, y, `${label} ${fmt(0)}`, style).setOrigin(0.5);
    const counter = { value: 0 };
    this.tweens.add({
      targets: counter,
      value: finalValue,
      duration: 1200,
      ease: 'Sine.easeOut',
      onUpdate: () => text.setText(`${label} ${fmt(counter.value)}`),
      onComplete: () => text.setText(`${label} ${fmt(finalValue)}`),
    });
  }

  makeButton(centerX, centerY, label, fillColor, onClick) {
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
    const refresh = () => buttons.forEach((b, i) => b.setFocused(i === idx));
    refresh();
    const move = (delta) => { idx = (idx + delta + buttons.length) % buttons.length; refresh(); };
    this.input.keyboard?.on('keydown-LEFT', () => move(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => move(1));
    this.input.keyboard?.on('keydown-SPACE', () => buttons[idx].onClick());
    this.input.keyboard?.on('keydown-ENTER', () => buttons[idx].onClick());
  }

  spawnConfetti() {
    if (!this.textures.exists(SPARK_KEY)) {
      const g = this.add.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture(SPARK_KEY, 4, 4);
      g.destroy();
    }
    this.add.particles(0, 0, SPARK_KEY, {
      x: { min: 0, max: GAME_WIDTH },
      y: -10,
      lifespan: 3000,
      gravityY: 200,
      speedY: { min: 50, max: 150 },
      speedX: { min: -50, max: 50 },
      scale: { start: 1.5, end: 0 },
      tint: [0xffd93c, 0x4ad8ff, 0xff8aff, 0xffffff],
      frequency: 30,
    });
  }
}
