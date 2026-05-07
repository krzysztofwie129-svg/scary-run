// GameScene — pętla gameplay (sesja 5 update).
// Stan czytany z sessionManager (multiplayer-ready), 3-5 żyć z restartem
// levelu po stracie, anti-overlap spawner z tier mix per level,
// animowana ikona moneta w HUD.

import {
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_START_X,
  PLAYER_START_Y,
  SCORE_PER_SECOND,
  DIFFICULTY_RAMP_DURATION,
  FLYING_PUMPKIN_COOLDOWN_MS,
  LEVELS,
  COIN_Y_RANGE,
  COIN_PICKUP_PITCH,
  DIAMOND_PICKUP_PITCH,
  FINISH_LINE_TRIGGER_BEFORE_END,
  FINISH_SLOWMO_FACTOR,
  FINISH_SLOWMO_DURATION,
  PARTICLE_CRASH_COUNT,
  PARTICLE_CRASH_COLOR,
  PARTICLE_COIN_COUNT,
  PARTICLE_COIN_COLOR,
  PARTICLE_DIAMOND_COUNT,
  PARTICLE_DIAMOND_COLOR,
  HUD_FONT_SIZE,
  HUD_PROGRESS_BAR_WIDTH,
  HUD_PROGRESS_BAR_HEIGHT,
  HUD_LIFE_ICON_SIZE,
  HUD_COIN_ICON_SIZE,
  OBSTACLE_TIERS,
  MIN_OBSTACLE_DISTANCE_X,
  MIN_OBSTACLE_DISTANCE_AFTER_WALL,
  AIR_GROUND_RULE,
} from '../config.js';
import { ParallaxBackground } from '../entities/ParallaxBackground.js';
import { Ground } from '../entities/Ground.js';
import { Player } from '../entities/Player.js';
import { Obstacle } from '../entities/Obstacle.js';
import { Coin } from '../entities/Coin.js';
import { FinishLine } from '../entities/FinishLine.js';
import { AudioManager } from '../utils/AudioManager.js';
import { sessionManager } from '../utils/SessionManager.js';
import { formatScore, formatNumber } from '../utils/format.js';
import { playFanfare } from '../utils/SuccessFanfare.js';
import { InputHandler } from '../utils/InputHandler.js';

const SPARK_TEXTURE_KEY = '__spark_4x4';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init() {
    const player = sessionManager.currentPlayer();
    this.selectedChar = player.character;
    this.currentLevel = player.level;
    this.elapsedSeconds = 0;
    this.finishLineSpawned = false;
    this.finishSequenceStarted = false;
    this.lastObstacleTier = null;
    this.lastObstacleX = -Infinity;
  }

  create() {
    const lvl = LEVELS[this.currentLevel];
    this.lvl = lvl;
    this.worldSpeed = lvl.worldSpeed;

    this.audioManager = new AudioManager(this);
    if (lvl.musicVolume === 0) {
      this.audioManager.stopMusic();
      this.sound.stopAll();
    }

    this.cameras.main.setBackgroundColor('#1a0d2e');

    const layerKeys = [];
    for (let i = 1; i <= lvl.bgLayerCount; i++) layerKeys.push(`bg_${lvl.bgFolder}_layer${i}`);
    this.parallax = new ParallaxBackground(this, layerKeys, lvl.parallaxSpeeds);

    this.ground = new Ground(this);
    this.player = new Player(this, PLAYER_START_X, PLAYER_START_Y, this.selectedChar);
    this.player.setDepth(100);
    this.physics.add.collider(this.player, this.ground.group);

    this.obstacles = this.add.group();
    this.coins = this.add.group();

    this.ensureSparkTexture();
    this.particles = this.add.particles(0, 0, SPARK_TEXTURE_KEY, {
      lifespan: 600,
      speed: { min: 80, max: 220 },
      gravityY: 400,
      scale: { start: 1.5, end: 0 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    });
    this.particles.setDepth(150);

    // Sterowanie — klawiatura (SPACE/UP/W jump, DOWN/S slide) + tap zones
    // (górne 60% = jump, dolne 40% = slide). InputHandler tworzy interactive
    // rectangles depth 99998 (pod HUD 1000... wait, HUD ma 1000, tap 99998 więc
    // tap nad HUD — ale zone alpha 0 i nie blokuje wizualnie).
    this.inputHandler = new InputHandler(this, {
      onJump: () => this.player.jump(),
      onSlide: () => this.player.slide(),
    });

    this.lastFlyingPumpkinTime = -Infinity;
    this.scheduleNextObstacle();
    this.scheduleNextCoin();

    this.events.once('player-died', () => this.handlePlayerDeath());
    this.events.once('finish-line-crossed', () => this.handleFinishLineCrossed());
    this.events.once('shutdown', () => this.cleanup());

    this.createHUD();
    this.startTime = this.time.now;
  }

  ensureSparkTexture() {
    if (this.textures.exists(SPARK_TEXTURE_KEY)) return;
    const g = this.add.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 4, 4);
    g.generateTexture(SPARK_TEXTURE_KEY, 4, 4);
    g.destroy();
  }

  createHUD() {
    const player = sessionManager.currentPlayer();
    const fontStyle = {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: `${HUD_FONT_SIZE}px`,
      color: '#ffe066',
      stroke: '#000',
      strokeThickness: 4,
    };
    const subStyle = {
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      color: '#bdaee3',
      stroke: '#000',
      strokeThickness: 3,
    };

    // Lewy górny: ikony serc — DYNAMICZNE.
    // Stary kod tworzył MAX_LIVES (5) ikon i wyszarzał nieaktywne. Gracze
    // mylili to z "max 5 życ" zamiast "aktualnie 3 życia". Teraz tylko
    // aktywne czerwone serca; refreshLivesHUD destroy'uje + recreate.
    this.lifeIcons = [];
    this.refreshLivesHUD();

    this.levelText = this.add.text(20, 60, `LEVEL ${this.lvl.id} — ${this.lvl.name}`, fontStyle).setDepth(1000).setScrollFactor(0);
    this.timeText = this.add.text(20, 95, 'Time: 0:30', subStyle).setDepth(1000).setScrollFactor(0);

    // Środek górny: animowana ikona coin (sprite) + licznik, diament + licznik.
    // Coin spin anim — tworzymy raz, używamy w Coin.js i tutaj.
    if (!this.anims.exists('coin_spin')) {
      this.anims.create({
        key: 'coin_spin',
        frames: ['coin_00', 'coin_01', 'coin_02', 'coin_03', 'coin_05', 'coin_06']
          .map((k) => ({ key: k })),
        frameRate: 12,
        repeat: -1,
      });
    }
    const cx = GAME_WIDTH / 2;
    this.coinIcon = this.add.sprite(cx - 100, 28, 'coin_00').setOrigin(0.5);
    const coinScale = HUD_COIN_ICON_SIZE / 100; // textury są ~100x100
    this.coinIcon.setScale(coinScale);
    this.coinIcon.setDepth(1000).setScrollFactor(0);
    this.coinIcon.play('coin_spin');

    this.coinCountText = this.add.text(cx - 80, 28, formatNumber(player.coins), {
      ...fontStyle, fontSize: '24px',
    }).setOrigin(0, 0.5).setDepth(1000).setScrollFactor(0);

    this.diamondIcon = this.add.image(cx + 30, 28, 'diamond').setOrigin(0.5);
    this.diamondIcon.setScale(coinScale);
    this.diamondIcon.setDepth(1000).setScrollFactor(0);

    this.diamondCountText = this.add.text(cx + 50, 28, formatNumber(player.diamonds), {
      ...fontStyle, fontSize: '24px',
    }).setOrigin(0, 0.5).setDepth(1000).setScrollFactor(0);

    // Prawy górny: SCORE + (jeśli MP) imię gracza.
    const rightX = GAME_WIDTH - 20;
    this.scoreText = this.add.text(rightX, 16, `Score: ${formatScore(player.score)}`, { ...fontStyle, color: '#ffe066' })
      .setOrigin(1, 0).setDepth(1000).setScrollFactor(0);
    if (sessionManager.isMultiplayer) {
      this.add.text(rightX, 50, `${player.name} (P${sessionManager.currentPlayerIndex + 1})`, subStyle)
        .setOrigin(1, 0).setDepth(1000).setScrollFactor(0);
    }

    // Pasek progresu na górze.
    this.progressBarBg = this.add.graphics().setDepth(1000).setScrollFactor(0);
    this.progressBarBg.fillStyle(0x000000, 0.5);
    this.progressBarBg.fillRect((GAME_WIDTH - HUD_PROGRESS_BAR_WIDTH) / 2, 90, HUD_PROGRESS_BAR_WIDTH, HUD_PROGRESS_BAR_HEIGHT);
    this.progressBar = this.add.graphics().setDepth(1001).setScrollFactor(0);
  }

  refreshLivesHUD() {
    // Destroy old icons.
    if (this.lifeIcons) {
      for (const icon of this.lifeIcons) {
        try { icon.destroy(); } catch (e) { /* ignore */ }
      }
    }
    this.lifeIcons = [];
    const lives = sessionManager.currentPlayer().lives;
    for (let i = 0; i < lives; i++) {
      const x = 24 + i * (HUD_LIFE_ICON_SIZE + 6);
      const heart = this.add.image(x, 30, 'life').setOrigin(0, 0.5);
      heart.setDisplaySize(HUD_LIFE_ICON_SIZE, HUD_LIFE_ICON_SIZE);
      heart.setTint(0xff3030); // jasna czerwień (nadpisuje natywny kolor textury)
      heart.setDepth(1000).setScrollFactor(0);
      this.lifeIcons.push(heart);
    }
  }

  updateHUD(timeRemaining) {
    const player = sessionManager.currentPlayer();
    const seconds = Math.max(0, Math.ceil(timeRemaining));
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    this.timeText.setText(`Time: ${m}:${s.toString().padStart(2, '0')}`);
    this.coinCountText.setText(formatNumber(player.coins));
    this.diamondCountText.setText(formatNumber(player.diamonds));
    this.scoreText.setText(`Score: ${formatScore(player.score)}`);
    // Refresh hearts tylko gdy zmieni się liczba (drogie — destroy+create).
    if (this.lifeIcons.length !== player.lives) {
      this.refreshLivesHUD();
    }

    const progress = 1 - Math.max(0, timeRemaining) / this.lvl.duration;
    this.progressBar.clear();
    this.progressBar.fillStyle(0xffe066, 1);
    this.progressBar.fillRect(
      (GAME_WIDTH - HUD_PROGRESS_BAR_WIDTH) / 2,
      90,
      HUD_PROGRESS_BAR_WIDTH * progress,
      HUD_PROGRESS_BAR_HEIGHT,
    );
  }

  // === Spawner: tier mix + anti-overlap ===

  scheduleNextObstacle() {
    if (this.player?.isDead() || this.finishLineSpawned) return;
    const r = this.lvl.obstacleSpawnRate;
    let minGap = r.min;
    let maxGap = r.max;

    // Cooldown po flying_pumpkin (high tier).
    if (this.lastObstacleTier === 'high') {
      const cooldownSec = FLYING_PUMPKIN_COOLDOWN_MS / 1000;
      const sinceLast = (this.time.now - this.lastFlyingPumpkinTime) / 1000;
      const cooldownLeft = Math.max(0, cooldownSec - sinceLast);
      minGap = Math.max(minGap, cooldownLeft);
      maxGap = Math.max(maxGap, minGap + 0.3);
    }

    const gap = Phaser.Math.FloatBetween(minGap, maxGap);
    this.obstacleTimer = this.time.delayedCall(gap * 1000, () => {
      this.spawnObstacle();
      this.scheduleNextObstacle();
    });
  }

  /** Weighted random tier z lvl.obstacleMix. Z anti-overlap rule. */
  pickTier() {
    const mix = this.lvl.obstacleMix;
    let tier;
    let attempts = 0;
    do {
      const r = Math.random();
      let acc = 0;
      tier = 'low';
      for (const [name, weight] of Object.entries(mix)) {
        acc += weight;
        if (r < acc) { tier = name; break; }
      }
      attempts++;
      // Air-ground rule: jeśli poprzedni był high, nowy nie może być high.
      if (AIR_GROUND_RULE && this.lastObstacleTier === 'high' && tier === 'high') {
        continue;
      }
      break;
    } while (attempts < 8);
    return tier;
  }

  spawnObstacle() {
    if (this.player.isDead() || this.finishLineSpawned) return;

    // Min distance check: ostatnia spawnowana przeszkoda musi być co najmniej
    // MIN_OBSTACLE_DISTANCE_X od miejsca nowego spawnu (czyli GAME_WIDTH+50).
    // Jeśli za blisko (po szybkim ramp prędkości), opóźnij spawn 200ms.
    const newSpawnX = GAME_WIDTH + 50;
    // Po 'wall' wymusimy większą odległość — gracz musi mieć czas na lądowanie
    // po double jumpie zanim trafi w kolejną przeszkodę.
    const minDistance = this.lastObstacleTier === 'wall'
      ? MIN_OBSTACLE_DISTANCE_AFTER_WALL
      : MIN_OBSTACLE_DISTANCE_X;
    if (this.lastObstacleX !== -Infinity && (newSpawnX - this.lastObstacleX) < minDistance) {
      this.time.delayedCall(200, () => this.spawnObstacle());
      return;
    }

    const tier = this.pickTier();
    const tierDef = OBSTACLE_TIERS[tier];
    const types = tierDef.types;
    const type = types[Math.floor(Math.random() * types.length)];

    const obstacle = new Obstacle(this, newSpawnX, type);
    this.obstacles.add(obstacle);

    this.lastObstacleTier = tier;
    this.lastObstacleX = newSpawnX;
    if (tier === 'high') this.lastFlyingPumpkinTime = this.time.now;
  }

  scheduleNextCoin() {
    if (this.player?.isDead() || this.finishLineSpawned) return;
    const r = this.lvl.coinSpawnRate;
    const gap = Phaser.Math.FloatBetween(r.min, r.max);
    this.coinTimer = this.time.delayedCall(gap * 1000, () => {
      this.spawnCoin();
      this.scheduleNextCoin();
    });
  }

  spawnCoin() {
    if (this.player.isDead() || this.finishLineSpawned) return;
    const isDiamond = Math.random() < this.lvl.diamondChance;
    const baseY = Phaser.Math.Between(COIN_Y_RANGE[0], COIN_Y_RANGE[1]);

    if (!isDiamond && Math.random() < 0.3) {
      // 30% szans na łuk 3 monet.
      const arcCenterX = GAME_WIDTH + 50;
      const positions = [
        { dx: 0, dy: 0 },
        { dx: 60, dy: -30 },
        { dx: 120, dy: 0 },
      ];
      for (const p of positions) {
        this.coins.add(new Coin(this, arcCenterX + p.dx, baseY + p.dy, false));
      }
    } else {
      this.coins.add(new Coin(this, GAME_WIDTH + 50, baseY, isDiamond));
    }
  }

  update(time, delta) {
    if (this.player.isDead()) return;
    if (this.finishSequenceStarted) {
      this.parallax.update(this.worldSpeed, delta);
      this.ground.update(this.worldSpeed, delta);
      if (this.finishLine) this.finishLine.update(this.worldSpeed, delta);
      return;
    }

    this.elapsedSeconds += delta / 1000;

    const rampProgress = Math.min(this.elapsedSeconds, DIFFICULTY_RAMP_DURATION) / DIFFICULTY_RAMP_DURATION;
    this.worldSpeed = this.lvl.worldSpeed * (1 + 0.3 * rampProgress);

    this.parallax.update(this.worldSpeed, delta);
    this.ground.update(this.worldSpeed, delta);

    // Trackuj ostatnią przeszkodę X — przesuwa się razem ze światem.
    let maxObstacleX = -Infinity;
    this.obstacles.children.iterate((o) => {
      if (o && o.active) {
        o.update(this.worldSpeed, delta);
        if (o.x > maxObstacleX) maxObstacleX = o.x;
      }
      return true;
    });
    this.lastObstacleX = maxObstacleX;

    this.coins.children.iterate((c) => {
      if (c && c.active) c.update(this.worldSpeed, delta);
      return true;
    });
    if (this.finishLine) this.finishLine.update(this.worldSpeed, delta);

    // Survival score (10/s). Zapisujemy do sessionManager żeby przeżył restart.
    sessionManager.addSurvivalScore(SCORE_PER_SECOND * (delta / 1000));

    // Manual AABB — obstacles vs player.
    const pb = this.player.body;
    if (pb && !this.player.isDead()) {
      this.obstacles.children.iterate((o) => {
        if (!o || !o.active || !o.body) return true;
        const ob = o.body;
        if (
          pb.x < ob.x + ob.width && pb.x + pb.width > ob.x &&
          pb.y < ob.y + ob.height && pb.y + pb.height > ob.y
        ) {
          this.player.die();
          return false;
        }
        return true;
      });
    }

    // Manual AABB — coins vs player.
    if (pb && !this.player.isDead()) {
      this.coins.children.iterate((c) => {
        if (!c || !c.active || !c.body) return true;
        const cb = c.body;
        if (
          pb.x < cb.x + cb.width && pb.x + pb.width > cb.x &&
          pb.y < cb.y + cb.height && pb.y + pb.height > cb.y
        ) {
          this.collectCoin(c);
        }
        return true;
      });
    }

    const timeRemaining = this.lvl.duration - this.elapsedSeconds;
    if (!this.finishLineSpawned && timeRemaining <= FINISH_LINE_TRIGGER_BEFORE_END) {
      this.finishLineSpawned = true;
      this.finishLine = new FinishLine(this, GAME_WIDTH + 100);
      if (this.obstacleTimer) { this.obstacleTimer.remove(false); this.obstacleTimer = null; }
      if (this.coinTimer) { this.coinTimer.remove(false); this.coinTimer = null; }
    }

    this.updateHUD(timeRemaining);
  }

  collectCoin(coin) {
    if (!coin.active) return;
    const x = coin.x;
    const y = coin.y;
    const isDiamond = coin.isDiamond;
    coin.destroy();

    if (isDiamond) {
      sessionManager.addDiamond();
      this.audioManager.playSfx('coin', { rate: DIAMOND_PICKUP_PITCH });
      this.emitParticles(x, y, PARTICLE_DIAMOND_COLOR, PARTICLE_DIAMOND_COUNT);
    } else {
      const result = sessionManager.addCoin();
      this.audioManager.playSfx('coin', { rate: COIN_PICKUP_PITCH });
      this.emitParticles(x, y, PARTICLE_COIN_COLOR, PARTICLE_COIN_COUNT);
      if (result.extraLife) {
        this.showExtraLifeEffect();
      }
    }
  }

  showExtraLifeEffect() {
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '+1 LIFE!', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '64px',
      color: '#ff4080',
      stroke: '#fff',
      strokeThickness: 6,
      shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 16, fill: true },
    }).setOrigin(0.5).setDepth(2000);
    this.tweens.add({
      targets: t,
      y: GAME_HEIGHT / 2 - 100,
      alpha: 0,
      duration: 1500,
      onComplete: () => t.destroy(),
    });
    this.audioManager.playSfx('coin', { rate: 2.0, volume: 1.0 });
  }

  emitParticles(x, y, color, count) {
    if (!this.particles) return;
    this.particles.setParticleTint(color);
    this.particles.emitParticleAt(x, y, count);
  }

  handleFinishLineCrossed() {
    // Idempotent — gdyby event leciał drugi raz (np. event raised dwukrotnie
    // przez quirks w lifecycle), kolejne wywołania return early.
    if (this.finishSequenceStarted) return;
    this.finishSequenceStarted = true;

    if (this.obstacleTimer) { this.obstacleTimer.remove(false); this.obstacleTimer = null; }
    if (this.coinTimer) { this.coinTimer.remove(false); this.coinTimer = null; }

    // Slow-mo: prosty assignment zamiast tween. Tween na właściwości scene
    // bywał problematyczny — czasem .onComplete nie strzelał po destroy
    // sceny, blokując przejście. Zwykła zmienna jest deterministyczna.
    this.worldSpeed = this.worldSpeed * FINISH_SLOWMO_FACTOR;

    const flash = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0);
    flash.setDepth(2000).setScrollFactor(0);
    this.tweens.add({
      targets: flash,
      alpha: 0.7,
      duration: 200,
      yoyo: true,
      onComplete: () => { try { flash.destroy(); } catch (e) { /* ignore */ } },
    });

    // Fanfara — static import (był dynamic, jeden powód mniej do failu).
    try { playFanfare(); } catch (e) { /* ignore audio quirks */ }

    // Po FINISH_SLOWMO_DURATION + 300ms przejście do LevelComplete.
    // advanceLevel() przeniesione do LevelComplete.create — tam ekran pokazuje
    // ukończony level (player.level) zanim go inkrementuje przy NEXT LEVEL.
    this.time.delayedCall(FINISH_SLOWMO_DURATION + 300, () => {
      const player = sessionManager.currentPlayer();
      // player.level jest tym levelem który właśnie ukończono (0-based).
      // LevelComplete pokaże stats; jeśli to był ostatni level — GameComplete.
      if (player.level >= LEVELS.length - 1) {
        this.scene.start('GameCompleteScene');
      } else {
        this.scene.start('LevelCompleteScene');
      }
    });
  }

  handlePlayerDeath() {
    if (this.obstacleTimer) { this.obstacleTimer.remove(false); this.obstacleTimer = null; }
    if (this.coinTimer) { this.coinTimer.remove(false); this.coinTimer = null; }

    this.audioManager.playSfx('crash');
    this.emitParticles(this.player.x, this.player.y - 50, PARTICLE_CRASH_COLOR, PARTICLE_CRASH_COUNT);

    const gameOverForPlayer = sessionManager.loseLife();

    if (gameOverForPlayer) {
      // Wszystkie życia stracone — GameOverScene.
      this.time.delayedCall(200, () => this.audioManager.playSfx('gameover', { volume: 0.6 }));
      this.time.delayedCall(1500, () => {
        this.scene.start('GameOverScene', { source: 'gameplay' });
      });
    } else {
      // Życie tracone, restart tego samego levelu.
      this.time.delayedCall(1200, () => {
        this.scene.restart();
      });
    }
  }

  cleanup() {
    if (this.obstacleTimer) { this.obstacleTimer.remove(false); this.obstacleTimer = null; }
    if (this.coinTimer) { this.coinTimer.remove(false); this.coinTimer = null; }
    if (this.parallax) { this.parallax.destroy(); this.parallax = null; }
    if (this.inputHandler) { this.inputHandler.destroy(); this.inputHandler = null; }
  }
}
