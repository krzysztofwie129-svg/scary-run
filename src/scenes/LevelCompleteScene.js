// LevelCompleteScene — między levelami (sesja 10 redesign).
// 3-sekundowy "show": tytuł, gwiazdki, animowane countery, progress bar,
// motivation, achievement toasty. Logika nawigacji zachowana — NEXT LEVEL
// klikalne dopiero po pełnej sekwencji animacji.
//
// Data przekazywane z GameScene (scene.start data):
//   deathsThisLevel, timeRemainingPercent, scoreThisLevel,
//   coinsThisLevel, diamondsThisLevel

import { GAME_WIDTH, GAME_HEIGHT, LEVELS } from '../config.js';
import { AudioManager } from '../utils/AudioManager.js';
import { playFanfare } from '../utils/SuccessFanfare.js';
import { sessionManager } from '../utils/SessionManager.js';
import { formatScore } from '../utils/format.js';
import { Haptic } from '../utils/Haptic.js';
import { AchievementManager } from '../utils/AchievementManager.js';
import { StarRating } from '../utils/StarRating.js';
import { GameStateStore } from '../utils/GameStateStore.js';

const SPARK_KEY = '__spark_4x4';

export class LevelCompleteScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelCompleteScene' });
  }

  init(data) {
    this.player = sessionManager.currentPlayer();
    this.completedLevelIdx = this.player.level; // 0-based
    this.deathsThisLevel = data?.deathsThisLevel || 0;
    this.timeRemainingPercent = data?.timeRemainingPercent || 0;
    this.scoreThisLevel = data?.scoreThisLevel || 0;
    this.coinsThisLevel = data?.coinsThisLevel || 0;
    this.diamondsThisLevel = data?.diamondsThisLevel || 0;
  }

  create() {
    this.audioManager = new AudioManager(this);
    Haptic.levelComplete();
    GameStateStore.clear();

    const completedLvl = LEVELS[this.completedLevelIdx];
    const stars = StarRating.calculate(this.deathsThisLevel);
    this.stars = stars;
    this.nextReady = false;

    // === T+0.0s — TŁO + bg z levelu ===
    this.createBackground(completedLvl);

    // === T+0.2s — CONFETTI ===
    this.time.delayedCall(200, () => this.spawnConfetti());

    // === T+0.4s — TYTUŁ ===
    this.time.delayedCall(400, () => this.showTitle(completedLvl));

    // === T+0.8s — GWIAZDKI ===
    this.time.delayedCall(800, () => this.showStars(stars));

    // === T+1.6s — STATS COUNTERS ===
    this.time.delayedCall(1600, () => this.showStatsCounters());

    // === T+2.5s — PROGRESS BAR ===
    this.time.delayedCall(2500, () => this.showProgress(this.completedLevelIdx + 1, LEVELS.length));

    // === T+3.0s — NEXT LEVEL BUTTON + MOTIVATION ===
    this.time.delayedCall(3000, () => this.showNextButton(stars));

    // === T+3.5s — ACHIEVEMENT TOASTS ===
    this.time.delayedCall(3500, () => this.checkAndShowAchievements());

    try { playFanfare(); } catch (e) { /* ignore audio quirks */ }
  }

  createBackground(lvl) {
    const bgKey = `bg_${lvl.bgFolder}_layer1`;
    if (this.textures.exists(bgKey)) {
      const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey);
      bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.4);
    }
    // Gradient overlay (deep purple → near-black) dla czytelności tekstu.
    const overlay = this.add.graphics();
    overlay.fillGradientStyle(0x2a1248, 0x2a1248, 0x05030a, 0x05030a, 0.85);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  spawnConfetti() {
    const colors = [0xffd93c, 0xff6b6b, 0x4ecdc4, 0xff8cc6, 0xa78bfa];
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const color = colors[i % colors.length];
      const size = Phaser.Math.Between(6, 12);
      const particle = this.add.rectangle(x, -20, size, size, color);
      particle.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
      this.tweens.add({
        targets: particle,
        y: GAME_HEIGHT + 50,
        rotation: particle.rotation + Math.PI * Phaser.Math.FloatBetween(2, 4),
        x: x + Phaser.Math.Between(-100, 100),
        duration: Phaser.Math.Between(2500, 4000),
        delay: Phaser.Math.Between(0, 800),
        ease: 'Cubic.easeIn',
        onComplete: () => particle.destroy(),
      });
    }
  }

  showTitle(lvl) {
    const title = this.add.text(GAME_WIDTH / 2, -100, `LEVEL ${lvl.id} COMPLETE`, {
      fontSize: '72px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffd93c',
      stroke: '#000000',
      strokeThickness: 8,
      shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 8, fill: true },
    }).setOrigin(0.5);
    this.tweens.add({
      targets: title,
      y: 100,
      duration: 800,
      ease: 'Bounce.easeOut',
    });

    if (sessionManager.isMultiplayer && this.player?.name) {
      this.add.text(GAME_WIDTH / 2, 160, this.player.name, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '24px',
        color: '#ffe066',
        stroke: '#000',
        strokeThickness: 4,
      }).setOrigin(0.5);
    }
  }

  showStars(stars) {
    const starY = 200;
    const spacing = 110;
    const startX = GAME_WIDTH / 2 - spacing;
    for (let i = 0; i < 3; i++) {
      const x = startX + i * spacing;
      const isLit = i < stars;
      const star = this.add.text(x, starY, '★', {
        fontSize: '90px',
        color: isLit ? '#ffd93c' : '#444444',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setScale(0);

      this.tweens.add({
        targets: star,
        scale: 1,
        duration: 400,
        delay: i * 250,
        ease: 'Back.easeOut',
        onStart: () => {
          if (isLit) this.audioManager?.playSfx('coin', { volume: 0.4 });
        },
      });

      if (isLit) {
        this.time.delayedCall(i * 250 + 400, () => {
          this.tweens.add({
            targets: star,
            scale: 1.15,
            duration: 600,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
          });
        });
      }
    }
  }

  showStatsCounters() {
    const startY = 290;
    const lineHeight = 44;
    const labelStyle = {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: '#cccccc',
    };
    const stats = [
      { icon: '🪙', label: 'Monety', value: this.coinsThisLevel, color: '#ffd93c' },
      { icon: '💎', label: 'Diamenty', value: this.diamondsThisLevel, color: '#4ecdc4' },
      { icon: '❤️', label: 'Życia', value: this.player?.lives || 0, color: '#ff6b6b' },
      { icon: '⭐', label: 'Wynik', value: this.scoreThisLevel, color: '#ffffff', fmt: formatScore },
    ];
    stats.forEach((stat, i) => {
      const y = startY + i * lineHeight;
      this.add.text(GAME_WIDTH / 2 - 200, y, `${stat.icon}  ${stat.label}:`, labelStyle).setOrigin(0, 0.5);
      const valueText = this.add.text(GAME_WIDTH / 2 + 130, y, '0', {
        fontSize: '24px',
        fontFamily: 'Arial Black, sans-serif',
        color: stat.color,
      }).setOrigin(0, 0.5);
      const counter = { val: 0 };
      this.tweens.add({
        targets: counter,
        val: stat.value,
        duration: 800,
        delay: i * 150,
        ease: 'Cubic.easeOut',
        onUpdate: () => {
          const v = Math.floor(counter.val);
          valueText.setText(stat.fmt ? stat.fmt(v) : v.toString());
        },
        onComplete: () => {
          valueText.setText(stat.fmt ? stat.fmt(stat.value) : stat.value.toString());
        },
      });
    });
  }

  showProgress(currentLevel, totalLevels) {
    const y = 510;
    const barW = 500;
    const barH = 10;
    this.add.text(GAME_WIDTH / 2, y - 24, `Level ${currentLevel} of ${totalLevels}`, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaaaa',
    }).setOrigin(0.5);
    this.add.rectangle(GAME_WIDTH / 2, y, barW, barH, 0x333333).setStrokeStyle(1, 0x555555);
    const fillW = (currentLevel / totalLevels) * (barW - 2);
    const fill = this.add.rectangle(GAME_WIDTH / 2 - barW / 2 + 1, y, 0, barH - 2, 0xffd93c).setOrigin(0, 0.5);
    this.tweens.add({
      targets: fill,
      width: fillW,
      duration: 600,
      ease: 'Cubic.easeOut',
    });
  }

  showNextButton(stars) {
    const motivation = StarRating.motivationFor(stars);
    const motText = this.add.text(GAME_WIDTH / 2, 555, motivation, {
      fontSize: '24px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffd93c',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: motText, alpha: 1, duration: 400 });

    const isLast = this.completedLevelIdx >= LEVELS.length - 1;
    const buttonLabel = isLast ? '🏆 ZAKOŃCZ' : '▶ NEXT LEVEL';
    const onClick = () => this.handleNext();

    const button = this.add.text(GAME_WIDTH / 2, 640, buttonLabel, {
      fontSize: '38px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffffff',
      backgroundColor: '#5C3E70',
      stroke: '#ffd93c',
      strokeThickness: 3,
      padding: { x: 40, y: 14 },
      shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 8, fill: true },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setScale(0);

    this.tweens.add({
      targets: button,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.nextReady = true;
        button.on('pointerup', onClick);
        // Pulsowanie idle
        this.tweens.add({
          targets: button,
          scale: 1.05,
          duration: 800,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });
      },
    });
  }

  checkAndShowAchievements() {
    const player = sessionManager.currentPlayer();
    if (!player) return;
    const completedLevelId = this.completedLevelIdx + 1; // 1-based dla warunków

    const stats = {
      totalCoinsLifetime: player.coins,
      totalDiamondsLifetime: player.diamonds,
      diamondsThisLevel: this.diamondsThisLevel,
      deathsThisLevel: this.deathsThisLevel,
      consecutivePerfectLevels: (player.consecutivePerfectLevels || 0)
        + (this.deathsThisLevel === 0 ? 1 : 0), // ten level też się liczy
      timeRemainingPercent: this.timeRemainingPercent,
      gameCompletedNoDeaths: false, // TODO: track w GameComplete
      currentLevel: completedLevelId,
      gameComplete: completedLevelId >= LEVELS.length,
      scoreThisLevel: this.scoreThisLevel,
    };

    const newlyUnlocked = AchievementManager.checkAll(stats);
    newlyUnlocked.forEach((ach, i) => {
      this.time.delayedCall(i * 1500, () => this.showAchievementToast(ach, i));
    });
  }

  showAchievementToast(achievement, index) {
    const y = 60 + index * 90;
    const toast = this.add.container(GAME_WIDTH + 300, y);
    const bg = this.add.rectangle(0, 0, 340, 70, 0x1a0a2e).setStrokeStyle(3, 0xffd93c);
    const icon = this.add.text(-140, 0, achievement.icon, { fontSize: '36px' }).setOrigin(0.5);
    const titleText = this.add.text(-90, -12, '🏆 ACHIEVEMENT!', {
      fontSize: '13px',
      color: '#ffd93c',
      fontFamily: 'Arial Black, sans-serif',
    }).setOrigin(0, 0.5);
    const nameText = this.add.text(-90, 14, achievement.title, {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial Black, sans-serif',
    }).setOrigin(0, 0.5);
    toast.add([bg, icon, titleText, nameText]);
    toast.setDepth(5000);

    try { this.audioManager?.playSfx('coin', { volume: 0.5 }); } catch (e) { /* ignore */ }
    Haptic.extraLife();

    this.tweens.add({
      targets: toast,
      x: GAME_WIDTH - 200,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(2500, () => {
          this.tweens.add({
            targets: toast,
            x: GAME_WIDTH + 300,
            alpha: 0,
            duration: 400,
            ease: 'Cubic.easeIn',
            onComplete: () => toast.destroy(),
          });
        });
      },
    });
  }

  handleNext() {
    if (!this.nextReady) return; // guard przeciw spam-tap
    this.audioManager?.playSfx('click');
    const isLast = this.completedLevelIdx >= LEVELS.length - 1;
    if (isLast) {
      this.scene.start('GameCompleteScene');
    } else {
      sessionManager.advanceLevel();
      this.scene.start('GameScene');
    }
  }
}
