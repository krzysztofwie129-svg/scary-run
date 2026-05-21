// LevelCompleteScene — redesign sesja 8.x z baked assetami:
//   • bg (purple confetti + spotlight) + confetti overlay
//   • title image (LEVEL 1 COMPLETE) — overlay digit Phaser text dla
//     dynamicznych leveli (covers baked "1")
//   • 3 stars (gold + glow), revealed według StarRating
//   • 4-cell stat frame: MONETY / DIAMENTY / ŻYCIA / WYNIK
//   • progress frame + yellow fill (Level N of LEVELS_TOTAL)
//   • MISTRZOWSKO! rank badge (renderowany według stars count)
//   • NEXT LEVEL button
//
// Achievement toasts + fanfare zachowane.

import { GAME_WIDTH, GAME_HEIGHT, LEVELS } from '../config.js';
import { AudioManager } from '../utils/AudioManager.js';
import { playFanfare } from '../utils/SuccessFanfare.js';
import { sessionManager } from '../utils/SessionManager.js';
import { Haptic } from '../utils/Haptic.js';
import { AchievementManager } from '../utils/AchievementManager.js';
import { StarRating } from '../utils/StarRating.js';
import { GameStateStore } from '../utils/GameStateStore.js';
import { ScoreSystem } from '../systems/ScoreSystem.js';
import { RankingSystem } from '../systems/RankingSystem.js';

export class LevelCompleteScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LevelCompleteScene' });
  }

  init(data) {
    this.player = sessionManager.currentPlayer();
    this.completedLevelIdx = this.player.level;
    this.deathsThisLevel = data?.deathsThisLevel || 0;
    this.timeRemainingPercent = data?.timeRemainingPercent || 0;
    this.scoreThisLevel = data?.scoreThisLevel || 0;
    this.coinsThisLevel = data?.coinsThisLevel || 0;
    this.diamondsThisLevel = data?.diamondsThisLevel || 0;
    // levelStartScore ukończonego poziomu — przekazywany dalej do ChestSelectScene,
    // żeby skrzynka mogła re-finalizować run_score z bonusem skrzynki (ranking).
    this.levelStartScore = Number.isFinite(data?.levelStartScore) ? data.levelStartScore : 0;
  }

  create() {
    this.audioManager = new AudioManager(this);
    Haptic.levelComplete();
    // Sesja DangerWindow Fix: NIE clear save tutaj — handleFinishLineCrossed
    // już zapisał save z level+1 dla recovery przy iOS reload.

    const stars = StarRating.calculate(this.deathsThisLevel);
    this.stars = stars;
    this.nextReady = false;
    const levelNumber = this.completedLevelIdx + 1;

    // GameScene.handleFinishLineCrossed już zapisał per-level bestScore z
    // poprawną delta levelu. NIE liczymy tu ponownie z cumulative player.score
    // — nadpisałoby to GameScene's record (większy cumulative > mniejsza delta).
    // Zostawiamy tylko unlock następnego levelu (idempotent).
    {
      RankingSystem.unlock(levelNumber + 1);
      this._runResult = { rankingScore: 0, isNewRecord: false };
    }

    this.createBackground();
    this.time.delayedCall(150, () => this.spawnConfetti());
    this.time.delayedCall(300, () => this.showTitle(levelNumber));
    this.time.delayedCall(700, () => this.showStars(stars));
    this.time.delayedCall(1300, () => this.showStatsRow());
    this.time.delayedCall(1900, () => this.showProgress(levelNumber, LEVELS.length));
    this.time.delayedCall(2300, () => this.showRankAndNext(stars));
    this.time.delayedCall(3000, () => this.checkAndShowAchievements());

    try { playFanfare(); } catch (e) { /* ignore */ }
  }

  createBackground() {
    if (this.textures.exists('levelcomplete_bg')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'levelcomplete_bg')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    } else {
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x2a1248, 0x2a1248, 0x05030a, 0x05030a, 1);
      bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
    if (this.textures.exists('levelcomplete_confetti')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'levelcomplete_confetti')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
        .setDepth(50);
    }
  }

  spawnConfetti() {
    // Phaser-side dynamic confetti (na górze baked confetti overlay).
    const colors = [0xffd93c, 0xff6b6b, 0x4ecdc4, 0xff8cc6, 0xa78bfa];
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const color = colors[i % colors.length];
      const size = Phaser.Math.Between(6, 12);
      const particle = this.add.rectangle(x, -20, size, size, color).setDepth(60);
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

  showTitle(levelNumber) {
    const titleX = GAME_WIDTH / 2;
    const titleY = 130;
    const titleW = 480;
    const titleH = 320;

    if (this.textures.exists('levelcomplete_title')) {
      const title = this.add.image(titleX, -100, 'levelcomplete_title')
        .setDisplaySize(titleW, titleH)
        .setDepth(100);
      this.tweens.add({
        targets: title,
        y: titleY,
        duration: 700,
        ease: 'Bounce.easeOut',
      });

      // Digit overlay — covers baked "1" w title image. Position obliczone z
      // source 1536x1024: "1" centered ~x=1300, y=400 → display proportional.
      const digitX = titleX - titleW / 2 + (1300 / 1536) * titleW;
      const digitY = titleY - titleH / 2 + (400 / 1024) * titleH;
      const digit = this.add.text(digitX, -100, String(levelNumber), {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '92px',
        color: '#ffd93c',
        stroke: '#3a1d5a',
        strokeThickness: 10,
        shadow: { offsetX: 0, offsetY: 6, color: '#000', blur: 4, fill: true },
      }).setOrigin(0.5).setDepth(101);
      this.tweens.add({
        targets: digit,
        y: digitY,
        duration: 700,
        ease: 'Bounce.easeOut',
      });
    } else {
      this.add.text(titleX, titleY, `LEVEL ${levelNumber} COMPLETE`, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '64px',
        color: '#ffd93c',
        stroke: '#000',
        strokeThickness: 8,
      }).setOrigin(0.5).setDepth(100);
    }
  }

  showStars(stars) {
    const starY = 290;
    if (this.textures.exists('levelcomplete_stars')) {
      // Stars asset shows 3 gold stars. Renderujemy obraz pełny dla stars=3,
      // 2 stars dla stars=2 etc. — używamy crop X dla mniejszej liczby.
      const starsImg = this.add.image(GAME_WIDTH / 2, starY, 'levelcomplete_stars')
        .setDisplaySize(340, 114)
        .setDepth(100);
      // Capture scale po setDisplaySize żeby tween nie reset'ował do native size.
      const targetScaleX = starsImg.scaleX;
      const targetScaleY = starsImg.scaleY;
      starsImg.setScale(0);
      if (stars < 3) {
        starsImg.setTint(stars === 0 ? 0x444444 : (stars === 1 ? 0x888888 : 0xcccccc));
      }
      this.tweens.add({
        targets: starsImg,
        scaleX: targetScaleX,
        scaleY: targetScaleY,
        duration: 500,
        ease: 'Back.easeOut',
      });
    }
  }

  showStatsRow() {
    // 4-cell frame: MONETY / DIAMENTY / ŻYCIA / WYNIK.
    const frameY = 425;
    const frameW = 566;
    const frameH = 102;
    const cells = 4;
    const cellW = frameW / cells;
    const startX = GAME_WIDTH / 2 - frameW / 2;

    if (this.textures.exists('levelcomplete_stat_frame')) {
      this.add.image(GAME_WIDTH / 2, frameY, 'levelcomplete_stat_frame')
        .setDisplaySize(frameW, frameH)
        .setDepth(100);
    }

    const stats = [
      { label: 'MONETY',   value: this.coinsThisLevel,    color: '#ffd93c' },
      { label: 'DIAMENTY', value: this.diamondsThisLevel, color: '#c266ff' },
      { label: 'ZYCIA',    value: this.player?.lives || 0, color: '#ff5b5b' },
      { label: 'WYNIK',    value: this.scoreThisLevel,   color: '#ffd93c' },
    ];

    // Icon row — baked stat_icons asset (source 1100×275 = 4:1, zachowaj proporcje).
    if (this.textures.exists('levelcomplete_stat_icons')) {
      const iconsW = frameW * 0.85;
      const iconsH = iconsW / 4; // 4:1 ratio z source — bez squasha.
      this.add.image(GAME_WIDTH / 2, frameY - 50, 'levelcomplete_stat_icons')
        .setDisplaySize(iconsW, iconsH)
        .setDepth(101);
    }

    stats.forEach((s, idx) => {
      const cellX = startX + idx * cellW + cellW / 2;
      this.add.text(cellX, frameY + 18, s.label, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(102);

      const vt = this.add.text(cellX, frameY + 50, '0', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '34px',
        color: s.color,
        stroke: '#000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(102);
      const c = { v: 0 };
      this.tweens.add({
        targets: c, v: s.value, duration: 700, delay: idx * 120, ease: 'Cubic.easeOut',
        onUpdate: () => vt.setText(Math.floor(c.v).toString()),
        onComplete: () => vt.setText(s.value.toString()),
      });
    });
  }

  showProgress(currentLevel, totalLevels) {
    const y = 545;
    const barW = 480;
    const barH = 50; // grubszy bar żeby było widoczne (było 28 — pikselowato).

    this.add.text(GAME_WIDTH / 2, y - 28, `Level ${currentLevel} of ${totalLevels}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#dddddd',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(100);

    if (this.textures.exists('levelcomplete_progress_frame')) {
      this.add.image(GAME_WIDTH / 2, y, 'levelcomplete_progress_frame')
        .setDisplaySize(barW, barH)
        .setDepth(100);
    }

    if (this.textures.exists('levelcomplete_progress_fill')) {
      const fillW = barW - 70; // padding na arrow ends
      const fillX = GAME_WIDTH / 2 - fillW / 2;
      const fill = this.add.image(fillX, y, 'levelcomplete_progress_fill')
        .setOrigin(0, 0.5)
        .setDisplaySize(fillW, barH * 0.6)
        .setDepth(101);
      const baseScaleX = fill.scaleX;
      fill.scaleX = 0;
      this.tweens.add({
        targets: fill,
        scaleX: baseScaleX * (currentLevel / totalLevels),
        duration: 700,
        ease: 'Cubic.easeOut',
      });
    }
  }

  showRankAndNext(stars) {
    // MISTRZOWSKO! rank badge — source 900×225 (4:1), display 320×80 dla zachowania proporcji.
    if (this.textures.exists('levelcomplete_rank') && stars >= 2) {
      const rank = this.add.image(GAME_WIDTH / 2, 590, 'levelcomplete_rank')
        .setDisplaySize(320, 80)
        .setDepth(100)
        .setAlpha(0);
      this.tweens.add({
        targets: rank,
        alpha: 1,
        duration: 400,
      });
    } else {
      // Fallback motivation text dla gorszych ratings.
      const motivation = StarRating.motivationFor(stars);
      this.add.text(GAME_WIDTH / 2, 590, motivation, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '24px',
        color: '#ffd93c',
        stroke: '#000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(100);
    }

    // NEXT LEVEL button — source 900×300 (3:1), display 360×120 dla zachowania proporcji.
    const isLast = this.completedLevelIdx >= LEVELS.length - 1;
    const buttonY = 660;
    let button;
    if (this.textures.exists('levelcomplete_next') && !isLast) {
      button = this.add.image(GAME_WIDTH / 2, buttonY, 'levelcomplete_next')
        .setDisplaySize(360, 120)
        .setDepth(100);
    } else {
      button = this.add.text(GAME_WIDTH / 2, buttonY, isLast ? '🏆 ZAKOŃCZ' : '▶ NEXT LEVEL', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '32px',
        color: '#fff',
        backgroundColor: '#5C3E70',
        stroke: '#ffd93c',
        strokeThickness: 3,
        padding: { x: 30, y: 12 },
      }).setOrigin(0.5).setDepth(100);
    }
    const btnTargetScaleX = button.scaleX;
    const btnTargetScaleY = button.scaleY;
    button.setScale(0);

    this.tweens.add({
      targets: button,
      scaleX: btnTargetScaleX,
      scaleY: btnTargetScaleY,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.nextReady = true;
        button.setInteractive({ useHandCursor: true });
        button.on('pointerup', () => this.handleNext());
        // Pulsowanie idle (multiplikuje displaySize-derived scale).
        this.tweens.add({
          targets: button,
          scaleX: btnTargetScaleX * 1.05,
          scaleY: btnTargetScaleY * 1.05,
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
    const completedLevelId = this.completedLevelIdx + 1;

    const stats = {
      totalCoinsLifetime: player.coins,
      totalDiamondsLifetime: player.diamonds,
      diamondsThisLevel: this.diamondsThisLevel,
      deathsThisLevel: this.deathsThisLevel,
      consecutivePerfectLevels: (player.consecutivePerfectLevels || 0)
        + (this.deathsThisLevel === 0 ? 1 : 0),
      timeRemainingPercent: this.timeRemainingPercent,
      gameCompletedNoDeaths: false,
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
    const toast = this.add.container(GAME_WIDTH + 300, y).setDepth(5000);
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
    if (!this.nextReady) return;
    this.audioManager?.playSfx('click');
    const isLast = this.completedLevelIdx >= LEVELS.length - 1;
    if (isLast) {
      this.scene.start('GameCompleteScene');
    } else {
      sessionManager.advanceLevel();
      const hasChest = this.scene.manager?.getScene?.('ChestSelectScene');
      if (hasChest) {
        this.scene.start('ChestSelectScene', {
          nextScene: 'GameScene',
          // completedLevelIdx jest 0-based; ukończony poziom 1-based = idx + 1.
          completedLevel: this.completedLevelIdx + 1,
          levelStartScore: this.levelStartScore,
        });
      } else {
        this.scene.start('GameScene');
      }
    }
  }
}
