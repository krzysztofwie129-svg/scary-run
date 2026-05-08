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
  GROUND_Y,
  MAX_LIVES,
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
import { GameStateStore } from '../utils/GameStateStore.js';
import { Haptic } from '../utils/Haptic.js';
import { FullscreenManager } from '../utils/FullscreenManager.js';
import { PowerUp } from '../entities/PowerUp.js';
import { powerUpManager, POWER_UP_TYPES, POWER_UP_CONFIG, PowerUpManager } from '../utils/PowerUpManager.js';

const SPARK_TEXTURE_KEY = '__spark_4x4';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init() {
    const player = sessionManager.currentPlayer();
    // DEV: ?level=N w URL nadpisuje level (1-based, 1..LEVELS.length).
    // Aplikujemy TYLKO RAZ na page load — bez tego po NEXT LEVEL z LevelComplete
    // advanceLevel by zwiększył level do 7 (L8), a init przy starcie nowego
    // GameScene znów ustawiałby level=6 (L7) → infinite loop na L7.
    if (!GameScene._urlLevelApplied && typeof window !== 'undefined' && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get('level');
      const n = raw ? parseInt(raw, 10) : NaN;
      if (Number.isFinite(n) && n >= 1 && n <= LEVELS.length) {
        player.level = n - 1;
      }
      GameScene._urlLevelApplied = true;
    }
    this.selectedChar = player.character;
    this.currentLevel = player.level;
    this.elapsedSeconds = 0;
    this.finishLineSpawned = false;
    this.finishSequenceStarted = false;
    this.lastObstacleTier = null;
    this.lastObstacleX = -Infinity;
    // Reset idempotency flag — scene singleton instance persistuje między
    // restartami, bez tego po pierwszej śmierci handlePlayerDeath byłby zablokowany.
    this._deathHandled = false;
    // Sesja 10: snapshot + deaths reset (idempotent per level, scene.restart
    // po loseLife NIE resetuje deaths counter — patrz SessionManager.startLevel).
    sessionManager.startLevel();
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
    // Sesja C: power-ups group + manager reset na start levelu.
    this.powerUps = this.add.group();
    powerUpManager.clearAll();
    this.shieldAura = null;
    this.doubleCoinsActive = false;
    this.player.shieldActive = false;
    this.player.speedBoostActive = false;

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

    // Sterowanie — sesja 8: tylko jump. Cały ekran = tap zone, niewidzialna,
    // depth 99998 (zone alpha 0 — nie blokuje wizualnie HUD).
    this.inputHandler = new InputHandler(this, {
      onJump: () => this.player.jump(),
    });

    this.lastFlyingPumpkinTime = -Infinity;
    this.scheduleNextObstacle();
    this.scheduleNextCoin();
    this.scheduleNextPowerUp();

    this.events.once('player-died', () => this.handlePlayerDeath());
    this.events.once('finish-line-crossed', () => this.handleFinishLineCrossed());
    this.events.once('shutdown', () => this.cleanup());

    this.createHUD();
    this.startTime = this.time.now;

    // === Sesja P1: Pause + Save + Tab Blur ===

    // PAUSE button — prawy górny róg, pod Score (Score Y=16, Pause Y=80
    // żeby nie kolidowały).
    const pauseBtn = this.add.text(GAME_WIDTH - 30, 80, '⏸', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '40px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: { x: 12, y: 6 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true })
      .setDepth(10000).setScrollFactor(0);
    pauseBtn.on('pointerdown', () => this.pauseGame());

    // Auto-save state co 2 sekundy.
    this.saveStateTimer = this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => this.saveCurrentState(),
    });

    // Tab blur auto-pauza — gdy user przełączy zakładkę / minimalizuje
    // przeglądarkę / przyjdzie połączenie, pauzujemy automatycznie.
    this.visibilityHandler = () => {
      if (document.hidden && !this.scene.isPaused()) {
        this.pauseGame();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    // === Sesja P3: Wake Lock — ekran nie gaśnie w trakcie levelu ===
    FullscreenManager.keepAwake();

    // Re-acquire gdy gracz wraca do tabu (wake lock wygasa przy hidden tab).
    // OSOBNY listener od visibilityHandler (P1 pauza) — koegzystują bez kolizji.
    this.wakeLockHandler = () => {
      if (document.visibilityState === 'visible') {
        FullscreenManager.reacquireIfNeeded();
      }
    };
    document.addEventListener('visibilitychange', this.wakeLockHandler);
  }

  pauseGame() {
    if (this.scene.isPaused()) return;
    this.scene.pause();
    this.scene.launch('PauseScene', { parentSceneKey: this.scene.key });
  }

  saveCurrentState() {
    const player = sessionManager.currentPlayer();
    if (!player) return;
    GameStateStore.save({
      session: sessionManager.serialize(),
      currentLevel: this.currentLevel,
      elapsedSeconds: this.elapsedSeconds || 0,
    });
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

    // Sesja C: power-up HUD — slots pod paskiem progresu, lewy róg.
    this.powerUpHUDSlots = []; // [{ icon, bg, barFill, barBg, type }]
    this.powerUpListener = (event) => this.refreshPowerUpHUD();
    powerUpManager.addListener(this.powerUpListener);
    this.refreshPowerUpHUD();
  }

  refreshPowerUpHUD() {
    if (this.powerUpHUDSlots) {
      for (const slot of this.powerUpHUDSlots) {
        try { slot.bg?.destroy(); slot.icon?.destroy(); slot.label?.destroy(); slot.barBg?.destroy(); slot.barFill?.destroy(); } catch (e) { /* ignore */ }
      }
    }
    this.powerUpHUDSlots = [];
    const types = powerUpManager.getActiveTypes();
    if (types.length === 0) return;
    // Lewy-dolny: większe sloty (60px) z label pod ikoną + pulsujący progress bar nad.
    const startX = 60;
    const startY = GAME_HEIGHT - 110;
    const slotGap = 90;
    types.forEach((type, i) => {
      const cfg = POWER_UP_CONFIG[type];
      const x = startX + i * slotGap;
      const y = startY;
      const bg = this.add.circle(x, y, 30, cfg.color, 0.95)
        .setStrokeStyle(4, 0xffffff)
        .setDepth(10000).setScrollFactor(0);
      const icon = this.add.text(x, y, cfg.icon, { fontSize: '36px' })
        .setOrigin(0.5).setDepth(10001).setScrollFactor(0);
      const label = this.add.text(x, y + 42, cfg.label, {
        fontSize: '12px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#ffffff',
        stroke: '#000',
        strokeThickness: 2,
      }).setOrigin(0.5).setDepth(10001).setScrollFactor(0);
      let barBg = null;
      let barFill = null;
      if (cfg.duration > 0) {
        barBg = this.add.rectangle(x, y - 42, 60, 6, 0x000000, 0.6)
          .setStrokeStyle(1, 0xffffff)
          .setDepth(10001).setScrollFactor(0);
        barFill = this.add.rectangle(x - 30, y - 42, 60, 4, cfg.color)
          .setOrigin(0, 0.5).setDepth(10002).setScrollFactor(0);
      }
      // Pulsująca animacja na ikonie (subtle).
      this.tweens.add({
        targets: [bg, icon],
        scale: 1.1,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.powerUpHUDSlots.push({ bg, icon, label, barBg, barFill, type });
    });
  }

  updatePowerUpHUDBars() {
    if (!this.powerUpHUDSlots) return;
    for (const slot of this.powerUpHUDSlots) {
      if (!slot.barFill) continue;
      const pct = powerUpManager.remainingPercent(slot.type);
      slot.barFill.scaleX = pct;
    }
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

  // Sesja C: spawn power-up co 15-20s.
  scheduleNextPowerUp() {
    if (this.player?.isDead() || this.finishLineSpawned) return;
    const gap = Phaser.Math.Between(15000, 20000);
    this.powerUpTimer = this.time.delayedCall(gap, () => {
      this.spawnPowerUp();
      this.scheduleNextPowerUp();
    });
  }

  spawnPowerUp() {
    if (this.player.isDead() || this.finishLineSpawned) return;
    // Wyklucz typy aktualnie aktywne (nie spawnuj duplikatu).
    const activeTypes = powerUpManager.getActiveTypes();
    const type = PowerUpManager.randomType(activeTypes);
    const x = GAME_WIDTH + 60;
    const y = Phaser.Math.Between(GROUND_Y - 220, GROUND_Y - 80);
    const pu = new PowerUp(this, x, y, type);
    this.powerUps.add(pu);
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
    let baseSpeed = this.lvl.worldSpeed * (1 + 0.3 * rampProgress);
    // Sesja C: speed boost ×1.4 gdy SPEED active.
    if (powerUpManager.isActive(POWER_UP_TYPES.SPEED)) baseSpeed *= 1.4;
    this.worldSpeed = baseSpeed;

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
    // Sesja C: power-ups movement.
    this.powerUps.children.iterate((p) => {
      if (p && p.active) p.update(this.worldSpeed, delta);
      return true;
    });
    if (this.finishLine) this.finishLine.update(this.worldSpeed, delta);

    // Sesja C: magnet — przyciągaj monety w promieniu 250px.
    if (powerUpManager.isActive(POWER_UP_TYPES.MAGNET)) {
      const magnetRange = 250;
      const px = this.player.x;
      const py = this.player.y;
      this.coins.children.iterate((c) => {
        if (!c || !c.active) return true;
        const dx = px - c.x;
        const dy = py - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < magnetRange && dist > 0) {
          const speed = 800 * (1 - dist / magnetRange);
          c.x += (dx / dist) * speed * (delta / 1000);
          c.y += (dy / dist) * speed * (delta / 1000);
          if (c.body) c.body.updateFromGameObject();
        }
        return true;
      });
    }

    // Sesja C: shield aura follows player.
    if (this.shieldAura && this.shieldAura.active) {
      this.shieldAura.x = this.player.x;
      this.shieldAura.y = this.player.y;
      if (!powerUpManager.isActive(POWER_UP_TYPES.SHIELD)) {
        this.shieldAura.destroy();
        this.shieldAura = null;
      }
    }

    // Sesja Polish: magnet ring follows player + cleanup po expire.
    if (this.magnetRing) {
      if (powerUpManager.isActive(POWER_UP_TYPES.MAGNET)) {
        this.magnetRing.x = this.player.x;
        this.magnetRing.y = this.player.y;
      } else {
        try { this.magnetRing.destroy(); } catch (e) { /* ignore */ }
        this.magnetRing = null;
      }
    }

    // Survival score (10/s). Zapisujemy do sessionManager żeby przeżył restart.
    sessionManager.addSurvivalScore(SCORE_PER_SECOND * (delta / 1000));

    // Manual AABB — obstacles vs player. Sesja 8: slide usunięty,
    // każdy overlap = śmierć (niezależnie od typu obstacle).
    // Sesja C: shield absorbuje pierwsze hit, speed = invulnerable.
    const pb = this.player.body;
    if (pb && !this.player.isDead()) {
      this.obstacles.children.iterate((o) => {
        if (!o || !o.active || !o.body) return true;
        const ob = o.body;
        const overlap =
          pb.x < ob.x + ob.width && pb.x + pb.width > ob.x &&
          pb.y < ob.y + ob.height && pb.y + pb.height > ob.y;
        if (!overlap) return true;

        if (powerUpManager.isActive(POWER_UP_TYPES.SPEED)) {
          // SPEED = invulnerable, niszcz przeszkodę i kontynuuj.
          o.destroy();
          return true;
        }
        if (powerUpManager.isActive(POWER_UP_TYPES.SHIELD)) {
          // SHIELD absorbuje hit — deactivate + cyan flash + niszcz przeszkodę.
          powerUpManager.deactivate(POWER_UP_TYPES.SHIELD);
          this.player.shieldActive = false;
          if (this.shieldAura) { this.shieldAura.destroy(); this.shieldAura = null; }
          this.cameras.main.flash(200, 78, 205, 196, false);
          o.destroy();
          return false;
        }
        this.player.die();
        return false;
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

    // Sesja C: power-ups vs player AABB.
    if (pb && !this.player.isDead()) {
      this.powerUps.children.iterate((p) => {
        if (!p || !p.active || !p.body) return true;
        const pob = p.body;
        if (
          pb.x < pob.x + pob.width && pb.x + pb.width > pob.x &&
          pb.y < pob.y + pob.height && pb.y + pb.height > pob.y
        ) {
          this.collectPowerUp(p);
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
      if (this.powerUpTimer) { this.powerUpTimer.remove(false); this.powerUpTimer = null; }
    }

    this.updateHUD(timeRemaining);
    this.updatePowerUpHUDBars();
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
      Haptic.diamond();
    } else {
      // Sesja C: DOUBLE_COINS = +2 zamiast +1.
      const multiplier = powerUpManager.isActive(POWER_UP_TYPES.DOUBLE_COINS) ? 2 : 1;
      let result = { extraLife: false };
      for (let i = 0; i < multiplier; i++) {
        const r = sessionManager.addCoin();
        if (r.extraLife) result.extraLife = true;
      }
      this.audioManager.playSfx('coin', { rate: COIN_PICKUP_PITCH });
      this.emitParticles(x, y, PARTICLE_COIN_COLOR, PARTICLE_COIN_COUNT);
      // Polish: floating "+2" gdy DOUBLE_COINS — gracz widzi że bonus działa.
      if (multiplier === 2) this.showFloatingText(x, y, '+2', '#b084ff');
      if (result.extraLife) {
        this.showExtraLifeEffect();
        // Bug fix: refresh HUD natychmiast, nie czekaj na updateHUD —
        // user wcześniej widział "lose 2 lives" bo bonus heart nie zdążył
        // pojawić się przed crash (1-frame delay + visual confusion).
        this.refreshLivesHUD();
        Haptic.extraLife();
      } else {
        Haptic.coin();
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

  showFloatingText(x, y, text, colorHex) {
    const t = this.add.text(x, y - 20, text, {
      fontSize: '32px',
      fontFamily: 'Arial Black, sans-serif',
      color: colorHex,
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(99998);
    this.tweens.add({
      targets: t,
      y: y - 80,
      alpha: 0,
      scale: 1.5,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  // === Sesja C: power-up collect + effects ===

  collectPowerUp(pu) {
    if (!pu.active) return;
    const type = pu.type;
    pu.destroy();
    if (!type) return;
    const cfg = POWER_UP_CONFIG[type];
    if (!cfg) return;

    powerUpManager.activate(type);
    this.applyPowerUpEffect(type);

    // Wielki toast środek ekranu — czytelny komunikat dla gracza.
    this.showPowerUpToast(cfg);

    // Camera flash w kolorze power-upa + shake.
    this.cameras.main.flash(300,
      (cfg.color >> 16) & 0xff,
      (cfg.color >> 8) & 0xff,
      cfg.color & 0xff,
      false);
    this.cameras.main.shake(150, 0.005);

    this.audioManager?.playSfx('coin', { rate: 1.6, volume: 0.7 });
    Haptic.diamond();
  }

  showPowerUpToast(cfg) {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 100;
    const container = this.add.container(cx, cy).setDepth(99999);

    const bg = this.add.rectangle(0, 0, 420, 140, cfg.color, 0.95)
      .setStrokeStyle(4, 0xffffff);
    const icon = this.add.text(-150, 0, cfg.icon, { fontSize: '64px' }).setOrigin(0.5);
    const labelText = this.add.text(-90, -22, cfg.label, {
      fontSize: '32px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    }).setOrigin(0, 0.5);
    const descText = this.add.text(-90, 22, cfg.description, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0, 0.5);
    container.add([bg, icon, labelText, descText]);

    if (cfg.duration > 0) {
      const seconds = Math.round(cfg.duration / 1000);
      const dur = this.add.text(160, 50, `${seconds}s`, {
        fontSize: '20px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#ffd93c',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0.5);
      container.add(dur);
    } else if (cfg.duration === -1) {
      const dur = this.add.text(160, 50, 'AKTYWNE', {
        fontSize: '16px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#ffd93c',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0.5);
      container.add(dur);
    }

    // Pop-in scale 0 → 1.1 → 1.0
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scale: 1.1,
      duration: 200,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: container, scale: 1.0, duration: 100 });
      },
    });
    // Auto-hide po 1.5s, fade up + alpha 0.
    this.time.delayedCall(1500, () => {
      this.tweens.add({
        targets: container,
        alpha: 0,
        y: cy - 30,
        duration: 400,
        ease: 'Cubic.easeIn',
        onComplete: () => container.destroy(),
      });
    });
  }

  applyPowerUpEffect(type) {
    if (type === POWER_UP_TYPES.MAGNET) {
      // Pull-coins logic w update(). Pokaż pierścień zasięgu wokół gracza.
      this.createMagnetVisual();
      return;
    }
    if (type === POWER_UP_TYPES.SHIELD) {
      this.player.shieldActive = true;
      this.createShieldVisual();
      return;
    }
    if (type === POWER_UP_TYPES.SPEED) {
      this.player.speedBoostActive = true;
      this.player.setTint(0xffd93c);
      this.createSpeedTrail();
      this.time.delayedCall(POWER_UP_CONFIG[POWER_UP_TYPES.SPEED].duration, () => {
        this.player.speedBoostActive = false;
        try { this.player.clearTint(); } catch (e) { /* ignore */ }
        if (this.speedTrail) { try { this.speedTrail.destroy(); } catch (e) { /* ignore */ } this.speedTrail = null; }
        powerUpManager.deactivate(POWER_UP_TYPES.SPEED);
      });
      return;
    }
    if (type === POWER_UP_TYPES.DOUBLE_COINS) {
      this.doubleCoinsActive = true;
      this.time.delayedCall(POWER_UP_CONFIG[POWER_UP_TYPES.DOUBLE_COINS].duration, () => {
        this.doubleCoinsActive = false;
        powerUpManager.deactivate(POWER_UP_TYPES.DOUBLE_COINS);
      });
      return;
    }
    if (type === POWER_UP_TYPES.HEART) {
      const player = sessionManager.currentPlayer();
      if (player) {
        player.lives = Math.min(player.lives + 1, MAX_LIVES);
        this.refreshLivesHUD();
      }
      this.createHeartFloatAnimation();
      Haptic.extraLife();
    }
  }

  createMagnetVisual() {
    if (this.magnetRing) { try { this.magnetRing.destroy(); } catch (e) { /* ignore */ } }
    this.magnetRing = this.add.graphics();
    this.magnetRing.lineStyle(3, 0xff6b9d, 0.4);
    this.magnetRing.strokeCircle(0, 0, 250);
    this.magnetRing.setDepth(this.player.depth - 1);
    this.tweens.add({
      targets: this.magnetRing,
      alpha: 0.2,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  createSpeedTrail() {
    if (!this.textures.exists('coin_00')) return;
    this.speedTrail = this.add.particles(0, 0, 'coin_00', {
      follow: this.player,
      followOffset: { x: -30, y: 0 },
      lifespan: 400,
      speed: { min: -100, max: -50 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.6, end: 0 },
      quantity: 2,
      frequency: 50,
      tint: 0xffd93c,
    });
    this.speedTrail.setDepth(this.player.depth - 1);
  }

  createHeartFloatAnimation() {
    // Serce pojawia się na pozycji gracza, leci do HUD lives (lewy-góra).
    const heart = this.add.text(this.player.x, this.player.y - 40, '❤️', {
      fontSize: '64px',
    }).setOrigin(0.5).setDepth(99999);
    this.tweens.add({
      targets: heart,
      x: 80,
      y: 50,
      scale: 0.5,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeIn',
      onComplete: () => heart.destroy(),
    });
  }

  createShieldVisual() {
    if (this.shieldAura) {
      try { this.shieldAura.destroy(); } catch (e) { /* ignore */ }
    }
    this.shieldAura = this.add.circle(this.player.x, this.player.y, 70, 0x4ecdc4, 0.18)
      .setStrokeStyle(3, 0x4ecdc4, 0.85)
      .setDepth(this.player.depth - 1);
    this.tweens.add({
      targets: this.shieldAura,
      scale: 1.15,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  handleFinishLineCrossed() {
    // Idempotent — gdyby event leciał drugi raz (np. event raised dwukrotnie
    // przez quirks w lifecycle), kolejne wywołania return early.
    if (this.finishSequenceStarted) return;
    this.finishSequenceStarted = true;

    if (this.obstacleTimer) { this.obstacleTimer.remove(false); this.obstacleTimer = null; }
    if (this.coinTimer) { this.coinTimer.remove(false); this.coinTimer = null; }
    if (this.powerUpTimer) { this.powerUpTimer.remove(false); this.powerUpTimer = null; }
    powerUpManager.clearAll();
    if (this.shieldAura) { try { this.shieldAura.destroy(); } catch (e) { /* ignore */ } this.shieldAura = null; }
    if (this.magnetRing) { try { this.magnetRing.destroy(); } catch (e) { /* ignore */ } this.magnetRing = null; }
    if (this.speedTrail) { try { this.speedTrail.destroy(); } catch (e) { /* ignore */ } this.speedTrail = null; }

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

    // Sesja P1: clear save — gracz świadomie przeszedł level, "Continue"
    // by wracał do tego samego startu zamiast kontynuować nową progresję.
    GameStateStore.clear();

    // Po FINISH_SLOWMO_DURATION + 300ms przejście do LevelComplete.
    // advanceLevel() przeniesione do LevelComplete.create — tam ekran pokazuje
    // ukończony level (player.level) zanim go inkrementuje przy NEXT LEVEL.
    this.time.delayedCall(FINISH_SLOWMO_DURATION + 300, () => {
      const player = sessionManager.currentPlayer();
      // Sesja 10: stats per-level dla LevelComplete (star rating, achievements).
      const snap = player.levelStartSnapshot || { coins: 0, diamonds: 0, score: 0 };
      const timeRemaining = Math.max(0, this.lvl.duration - this.elapsedSeconds);
      const sceneData = {
        deathsThisLevel: player.deathsThisLevel || 0,
        timeRemainingPercent: timeRemaining / this.lvl.duration,
        scoreThisLevel: Math.floor(player.score - snap.score),
        coinsThisLevel: player.coins - snap.coins,
        diamondsThisLevel: player.diamonds - snap.diamonds,
      };
      // player.level jest tym levelem który właśnie ukończono (0-based).
      // LevelComplete pokaże stats; jeśli to był ostatni level — GameComplete.
      if (player.level >= LEVELS.length - 1) {
        this.scene.start('GameCompleteScene', sceneData);
      } else {
        this.scene.start('LevelCompleteScene', sceneData);
      }
    });
  }

  handlePlayerDeath() {
    // Idempotent guard — gdyby player-died event fire'ował dwukrotnie (Phaser
    // quirks albo my emit z dwóch ścieżek), bez tego loseLife() leciałoby 2x
    // i HUD pokazywałby -2 serca per crash zamiast -1.
    if (this._deathHandled) return;
    this._deathHandled = true;

    if (this.obstacleTimer) { this.obstacleTimer.remove(false); this.obstacleTimer = null; }
    if (this.coinTimer) { this.coinTimer.remove(false); this.coinTimer = null; }
    if (this.powerUpTimer) { this.powerUpTimer.remove(false); this.powerUpTimer = null; }
    // Bug fix: save timer mógł fire w 1.5s delay PO GameStateStore.clear(),
    // re-zapisując state i powodując że KONTYNUUJ pojawia się po game over.
    if (this.saveStateTimer) { this.saveStateTimer.remove(); this.saveStateTimer = null; }
    powerUpManager.clearAll();
    if (this.shieldAura) { try { this.shieldAura.destroy(); } catch (e) { /* ignore */ } this.shieldAura = null; }
    if (this.magnetRing) { try { this.magnetRing.destroy(); } catch (e) { /* ignore */ } this.magnetRing = null; }
    if (this.speedTrail) { try { this.speedTrail.destroy(); } catch (e) { /* ignore */ } this.speedTrail = null; }

    this.audioManager.playSfx('crash');
    this.emitParticles(this.player.x, this.player.y - 50, PARTICLE_CRASH_COLOR, PARTICLE_CRASH_COUNT);

    const gameOverForPlayer = sessionManager.loseLife();
    // Bug fix: refresh HUD natychmiast po loseLife żeby user widział że
    // znikło DOKŁADNIE 1 serce. Wcześniej HUD update czekał na scene.restart
    // (1.2s później) — w tym czasie update() nic nie robi (player.isDead),
    // więc visualnie wyglądało jak "skip" lub zniknięcie kilku serc naraz.
    this.refreshLivesHUD();

    if (gameOverForPlayer) {
      // Wszystkie życia stracone — GameOverScene + clear save (sesja P1).
      GameStateStore.clear();
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
    if (this.powerUpTimer) { this.powerUpTimer.remove(false); this.powerUpTimer = null; }
    powerUpManager.clearAll();
    if (this.powerUpListener) { powerUpManager.removeListener(this.powerUpListener); this.powerUpListener = null; }
    if (this.shieldAura) { try { this.shieldAura.destroy(); } catch (e) { /* ignore */ } this.shieldAura = null; }
    if (this.magnetRing) { try { this.magnetRing.destroy(); } catch (e) { /* ignore */ } this.magnetRing = null; }
    if (this.speedTrail) { try { this.speedTrail.destroy(); } catch (e) { /* ignore */ } this.speedTrail = null; }
    if (this.parallax) { this.parallax.destroy(); this.parallax = null; }
    if (this.inputHandler) { this.inputHandler.destroy(); this.inputHandler = null; }
    if (this.saveStateTimer) { this.saveStateTimer.remove(); this.saveStateTimer = null; }
    if (this.visibilityHandler) {
      try { document.removeEventListener('visibilitychange', this.visibilityHandler); } catch (e) { /* ignore */ }
      this.visibilityHandler = null;
    }
    if (this.wakeLockHandler) {
      try { document.removeEventListener('visibilitychange', this.wakeLockHandler); } catch (e) { /* ignore */ }
      this.wakeLockHandler = null;
    }
  }
}
