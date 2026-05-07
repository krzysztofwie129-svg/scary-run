// LevelCompleteScene — między levelami. Czyta state z sessionManager.
// player.level w init = ukończony level (0-based). advanceLevel() wywołujemy
// dopiero przy klik NEXT LEVEL — LCScene pokazuje stats UKOŃCZONEGO levelu,
// potem advance i start GameScene z nowym levelem.

import { GAME_WIDTH, GAME_HEIGHT, LEVELS } from '../config.js';
import { AudioManager } from '../utils/AudioManager.js';
import { playFanfare } from '../utils/SuccessFanfare.js';
import { sessionManager } from '../utils/SessionManager.js';
import { formatScore } from '../utils/format.js';

const SPARK_KEY = '__spark_4x4';

export class LevelCompleteScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelCompleteScene' });
  }

  init() {
    this.player = sessionManager.currentPlayer();
    // player.level (0-based) to ukończony level. NIE odejmujemy 1 — GameScene
    // nie inkrementuje przed startem tej sceny (sesja 5.2 fix).
    this.completedLevelIdx = this.player.level;
  }

  create() {
    this.audioManager = new AudioManager(this);

    const completedLvl = LEVELS[this.completedLevelIdx];
    const bgKey = `bg_${completedLvl.bgFolder}_layer1`;
    if (this.textures.exists(bgKey)) {
      const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey);
      bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.5);
    }
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.55);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    if (this.textures.exists('pumpkin')) {
      const pumpkin = this.add.image(GAME_WIDTH / 2, 110, 'pumpkin').setScale(0.6);
      this.tweens.add({
        targets: pumpkin,
        scale: 0.7,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    this.add.text(GAME_WIDTH / 2, 220, `LEVEL ${completedLvl.id} COMPLETE`, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '64px',
      color: '#ffd93c',
      stroke: '#000',
      strokeThickness: 8,
      shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 8, fill: true },
    }).setOrigin(0.5);

    if (sessionManager.isMultiplayer) {
      this.add.text(GAME_WIDTH / 2, 270, this.player.name, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '28px',
        color: '#ffe066',
        stroke: '#000',
        strokeThickness: 4,
      }).setOrigin(0.5);
    }

    const labelStyle = {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#e8d8ff',
      stroke: '#000',
      strokeThickness: 3,
    };

    const startY = sessionManager.isMultiplayer ? 320 : 300;
    let y = startY;
    const lh = 36;

    // Animowane countery — pokazują total stats po levelu.
    this.makeAnimatedStat(GAME_WIDTH / 2, y, '🪙 Total coins:', this.player.coins, labelStyle); y += lh;
    this.makeAnimatedStat(GAME_WIDTH / 2, y, '💎 Total diamonds:', this.player.diamonds, labelStyle); y += lh;
    this.makeAnimatedStat(GAME_WIDTH / 2, y, '❤️ Lives left:', this.player.lives, labelStyle); y += lh + 16;

    const sep = this.add.graphics();
    sep.lineStyle(2, 0xffd93c, 0.5);
    sep.lineBetween(GAME_WIDTH / 2 - 200, y, GAME_WIDTH / 2 + 200, y);
    y += 24;

    this.makeAnimatedStat(GAME_WIDTH / 2, y, '⭐ Score:', Math.floor(this.player.score), labelStyle, true);

    // player.level (ukończony 0-based) + 1 = następny level. Jeśli >= LEVELS.length
    // nie ma kolejnego — GameComplete (ale właściwie to GameScene już by tu nie
    // zaszedł, bo handleFinishLineCrossed kieruje na GameComplete dla ostatniego).
    // Trzymam dla bezpieczeństwa.
    const isLast = this.player.level >= LEVELS.length - 1;
    const buttonLabel = isLast ? 'GAME COMPLETE! 🏆' : 'NEXT LEVEL →';
    const onClick = () => {
      this.audioManager.playSfx('click');
      if (isLast) {
        this.scene.start('GameCompleteScene');
      } else {
        // Advance dopiero teraz — po obejrzeniu stats ukończonego.
        sessionManager.advanceLevel();
        this.scene.start('GameScene');
      }
    };

    this.time.delayedCall(1500, () => {
      const btn = this.makeButton(GAME_WIDTH / 2, GAME_HEIGHT - 140, buttonLabel, 0x6b3eb6, onClick);
      btn.setFocused(true);
      this.input.keyboard?.once('keydown-ENTER', onClick);
      this.input.keyboard?.once('keydown-SPACE', onClick);
    });

    this.spawnConfetti();
    playFanfare();
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
      duration: 800,
      ease: 'Sine.easeOut',
      onUpdate: () => text.setText(`${label} ${fmt(counter.value)}`),
      onComplete: () => text.setText(`${label} ${fmt(finalValue)}`),
    });
  }

  spawnConfetti() {
    if (!this.textures.exists(SPARK_KEY)) {
      const g = this.add.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture(SPARK_KEY, 4, 4);
      g.destroy();
    }
    const emitter = this.add.particles(0, 0, SPARK_KEY, {
      x: { min: 0, max: GAME_WIDTH },
      y: -10,
      lifespan: 2500,
      gravityY: 200,
      speedY: { min: 50, max: 150 },
      speedX: { min: -50, max: 50 },
      scale: { start: 1.5, end: 0 },
      tint: [0xffd93c, 0x4ad8ff, 0xff8aff, 0xffffff],
      frequency: 50,
    });
    emitter.setDepth(500);
    this.time.delayedCall(2000, () => emitter.stop());
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
    hit.on('pointerup', onClick);

    return {
      setFocused(focused) {
        isFocused = focused;
        draw(focused ? fillColor + 0x101010 : fillColor);
        text.setScale(focused ? 1.05 : 1);
      },
    };
  }
}
