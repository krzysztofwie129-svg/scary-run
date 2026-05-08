// BossFightScene — boss po ukończeniu L1 (test mechaniki sesji Boss V1).
// Tap = atak gracza (-10 HP boss). Boss atakuje co 3s z wind-up 0.7s.
// VICTORY → LevelComplete + bonus +500. DEFEAT → restart L1 (lives reset).
//
// Animacje rejestrowane lazy per scena dla obu postaci (player + boss),
// bo Player.setupAnimations wywołuje się tylko dla bieżącej postaci gracza.
// Anim keys: `${charKey}_${anim}` (underscore — convention naszego repo).

import {
  GAME_WIDTH, GAME_HEIGHT, GROUND_Y,
  ANIM_FRAME_COUNTS,
  INITIAL_LIVES,
} from '../config.js';
import { sessionManager } from '../utils/SessionManager.js';
import { Haptic } from '../utils/Haptic.js';

const BOSS_HP_MAX = 100;
const PLAYER_DAMAGE = 10;
const BOSS_ATTACK_INTERVAL = 1000; // V2: szybsze ataki
const BOSS_WIND_UP_DURATION = 400; // V2: krótszy telegraph
const BOSS_PROJECTILE_FLY_MS = 500; // V2: szybciej leci
const BOSS_SCALE = 1.5;
// V5: padding kompensuje transparentny obszar pod stopami sprite'a żeby
// stopy POSTACI (nie sprite bottom) leżały na ground top edge.
const SPRITE_BOTTOM_PADDING = 20;

// V5 Ground Fix: manual override pozycji Y. Eksperymentuj 30→50→70→90 aż
// postacie stoja na pomoście. Sprite Y = GROUND_Y + offset (krok ostateczny
// w createPlayer/createBoss — nadpisuje wcześniejsze wartości).
const PLAYER_Y_OFFSET = 85;
const BOSS_Y_OFFSET = 135;

// V2: roll dodany dla slide animation (frames już ładowane przez PreloadScene).
const ANIMS = ['idle', 'run', 'jump', 'hit', 'fall', 'roll'];
const FRAME_RATES = { idle: 12, run: 30, jump: 24, fall: 12, hit: 30, roll: 24 };
const NON_LOOPING = new Set(['hit', 'roll']);

const pad2 = (n) => String(n).padStart(2, '0');

function ensureAnimsForChar(scene, charKey) {
  for (const anim of ANIMS) {
    const key = `${charKey}_${anim}`;
    if (scene.anims.exists(key)) continue;
    const count = ANIM_FRAME_COUNTS[anim];
    const frames = [];
    for (let i = 0; i < count; i++) frames.push({ key: `${charKey}_${anim}_${pad2(i)}` });
    scene.anims.create({
      key,
      frames,
      frameRate: FRAME_RATES[anim],
      repeat: NON_LOOPING.has(anim) ? 0 : -1,
    });
  }
}

export class BossFightScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BossFightScene' });
  }

  init(data) {
    this.fromLevel = data?.fromLevel || 1;
    this.fromSceneData = data?.sceneData || {};
    const allChars = ['char01', 'char02', 'char03'];
    const playerChar = sessionManager.currentPlayer()?.character || 'char01';
    const candidates = allChars.filter((c) => c !== playerChar);
    this.bossCharKey = data?.bossCharKey
      || candidates[Math.floor(Math.random() * candidates.length)];
    this.playerCharKey = playerChar;
  }

  create() {
    this.bossHP = BOSS_HP_MAX;
    this.playerHP = sessionManager.currentPlayer()?.lives || INITIAL_LIVES;
    this.fightOver = false;
    this.fightStarted = false; // V8: blokuje player attack/jump dopóki bos się nie aktywował (anti-spam-burst).
    this.playerInvulnerable = false; // V2: jump/slide ustawia true podczas trwania.
    this.lastAttackTime = 0; // V3: cooldown 600ms między atakami.
    this.activeProjectiles = []; // V3: physics-based pociski.
    // V5: triple jump — 3 jumpy zanim trzeba wylądować.
    this.jumpCount = 0;
    this.maxJumps = 3;

    ensureAnimsForChar(this, this.playerCharKey);
    ensureAnimsForChar(this, this.bossCharKey);

    this.createBackground();
    this.createPlayer();
    this.createBoss();
    this.createHUD();
    this.createInputHandlers();

    this.time.delayedCall(800, () => this.showIntroBanner());
    this.time.delayedCall(2200, () => this.startFight());
    this.createControlButtons();
  }

  createControlButtons() {
    // JUMP + ATTACK ikonki TYLKO jako visual hint (NIE klikalne).
    // Klikalność: lewa połowa ekranu = JUMP, prawa = ATTACK (createInputHandlers).
    const btnSize = 150;
    const margin = 95;

    const makeHintIcon = (x, key) => {
      if (!this.textures.exists(key)) return null;
      return this.add.image(x, GAME_HEIGHT - margin, key)
        .setDisplaySize(btnSize, btnSize)
        .setDepth(99990)
        .setAlpha(0.85);
    };

    this.jumpButton = makeHintIcon(margin, 'boss_btn_jump');
    this.attackButton = makeHintIcon(GAME_WIDTH - margin, 'boss_btn_attack');
  }

  createBackground() {
    // 1. Bg per level: boss_bg_01..10 (cycle modulo 10 dla level > 10).
    // fromLevel jest 1-based, więc index = (fromLevel-1) % 10 + 1.
    const bgNum = ((this.fromLevel - 1) % 10) + 1;
    const bgKey = `boss_bg_${String(bgNum).padStart(2, '0')}`;
    if (this.textures.exists(bgKey)) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey)
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
        .setDepth(-100);
    } else {
      const bg = this.add.graphics();
      bg.fillGradientStyle(0x2a1a4a, 0x2a1a4a, 0x1a0a2e, 0x1a0a2e, 1);
      bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      bg.setDepth(-100);
    }

    // 2. Drewniany ground pomost + 4 pasy drewna + ostry top edge.
    const groundY = GROUND_Y + 30;
    const ground = this.add.rectangle(GAME_WIDTH / 2, groundY, GAME_WIDTH, 60, 0x3d2817, 1);
    ground.setOrigin(0.5).setDepth(-50);
    for (let i = 0; i < 4; i++) {
      const lineY = groundY - 20 + i * 12;
      this.add.rectangle(GAME_WIDTH / 2, lineY, GAME_WIDTH, 1, 0x5c3a1a, 0.6)
        .setOrigin(0.5).setDepth(-49);
    }
    this.add.rectangle(GAME_WIDTH / 2, groundY - 30, GAME_WIDTH, 4, 0x8b5a2b, 1)
      .setOrigin(0.5).setDepth(-48);

    // 3. Czaszki w 4 rogach (subtle pulsing).
    const skullPositions = [
      { x: 60, y: GROUND_Y - 5 },
      { x: GAME_WIDTH - 60, y: GROUND_Y - 5 },
      { x: 30, y: 60 },
      { x: GAME_WIDTH - 30, y: 60 },
    ];
    skullPositions.forEach((pos, i) => {
      const skull = this.add.text(pos.x, pos.y, '💀', { fontSize: '32px' })
        .setOrigin(0.5).setDepth(-30).setAlpha(0.4);
      this.tweens.add({
        targets: skull, alpha: 0.6,
        duration: 1500 + i * 200,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    });

    // 4. Mgła cyjan — 3 warstwy floating.
    for (let i = 0; i < 3; i++) {
      const fogY = GAME_HEIGHT * 0.5 + i * 30;
      const fog = this.add.rectangle(GAME_WIDTH / 2, fogY, GAME_WIDTH, 50, 0x4ecdc4, 0.06);
      fog.setOrigin(0.5).setDepth(-40);
      this.tweens.add({
        targets: fog,
        x: fog.x + (i % 2 === 0 ? 30 : -30),
        duration: 4000 + i * 500,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // 5. Floating sparks (atmosfera).
    const sparkColors = [0xffd93c, 0xff6b9d, 0x4ecdc4];
    for (let i = 0; i < 12; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(GAME_HEIGHT * 0.2, GAME_HEIGHT * 0.7);
      const spark = this.add.circle(x, y, Phaser.Math.Between(2, 4), sparkColors[i % 3], 0.8)
        .setDepth(-35);
      this.tweens.add({
        targets: spark,
        y: spark.y - 30,
        alpha: 0.2,
        duration: 2000 + i * 100,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }

    // 6. Vignette (drama).
    const vignette = this.add.graphics();
    vignette.fillStyle(0x000000, 0.4);
    vignette.fillRect(0, 0, GAME_WIDTH, 100);
    vignette.fillRect(0, GAME_HEIGHT - 100, GAME_WIDTH, 100);
    vignette.fillRect(0, 0, 100, GAME_HEIGHT);
    vignette.fillRect(GAME_WIDTH - 100, 0, 100, GAME_HEIGHT);
    vignette.setDepth(-25).setAlpha(0.5);
  }

  createPlayer() {
    // V5: y = GROUND_Y + padding kompensuje transparentne piksele pod stopami
    // sprite'a (sprite bottom != character feet — texture ma margines).
    this.playerSprite = this.add.sprite(220, GROUND_Y + SPRITE_BOTTOM_PADDING, `${this.playerCharKey}_idle_00`)
      .setOrigin(0.5, 1)
      .setScale(0.5)
      .setDepth(100);
    this.playerSprite.play(`${this.playerCharKey}_idle`);

    // V5: body pokrywa cały widoczny obszar postaci żeby projectile zawsze
    // overlap'ował (CHARACTER_INFO.body offsety były zaprojektowane dla
    // origin 0.5/0.6 z gameplay'u — z origin 0.5/1 hitbox by się rozjechał).
    this.physics.add.existing(this.playerSprite);
    if (this.playerSprite.body) {
      this.playerSprite.body.setAllowGravity(false);
      this.playerSprite.body.setImmovable(true);
      this.playerSprite.body.setSize(220, 380);
      this.playerSprite.body.setOffset(207, 100);
    }
    // V5 Ground Fix: brutalne dosunięcie do ground (nadpisuje wszystko powyżej).
    this.playerSprite.y = GROUND_Y + PLAYER_Y_OFFSET;
    if (this.playerSprite.body) this.playerSprite.body.updateFromGameObject?.();
    this.playerBaseY = this.playerSprite.y;
  }

  createBoss() {
    // V5: y = GROUND_Y + scaled padding (boss 1.5× → padding × 1.5 też).
    const bossPad = SPRITE_BOTTOM_PADDING * BOSS_SCALE;
    const baseScale = 0.5 * BOSS_SCALE;
    this.bossSprite = this.add.sprite(GAME_WIDTH - 220, GROUND_Y + bossPad, `${this.bossCharKey}_idle_00`)
      .setOrigin(0.5, 1)
      .setScale(baseScale)
      .setFlipX(true)
      .setDepth(100);
    // V6: boss rośnie +15px wyższy per level (L1 = base, L2 = +15, L10 = +135).
    const bonusPx = 15 * Math.max(0, this.fromLevel - 1);
    if (bonusPx > 0) {
      const baseH = this.bossSprite.displayHeight;
      const finalScale = baseScale * (1 + bonusPx / baseH);
      this.bossSprite.setScale(finalScale);
    }
    this.bossSprite.play(`${this.bossCharKey}_idle`);
    // V5 Ground Fix: brutalne dosunięcie do ground.
    this.bossSprite.y = GROUND_Y + BOSS_Y_OFFSET;
  }

  createHUD() {
    // Player HP — serca lewa-góra.
    this.heartsContainer = this.add.container(40, 40).setDepth(1000);
    this.refreshPlayerHearts();

    // Boss HP bar — prawa-góra.
    const barX = GAME_WIDTH - 340;
    const barY = 40;
    this.add.rectangle(barX, barY, 320, 30, 0x000000, 0.7).setOrigin(0, 0.5).setDepth(1000);
    this.bossHPBar = this.add.rectangle(barX + 5, barY, 310, 22, 0xff3b3b, 1)
      .setOrigin(0, 0.5).setDepth(1001);
    this.bossHPText = this.add.text(barX + 160, barY, `BOSS ${this.bossHP}/100`, {
      fontSize: '18px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(1002);

    // V5: jump indicator — 3 złote kropki, każda gaśnie na zużyty jump.
    this.jumpIndicator = this.add.container(GAME_WIDTH / 2, 100).setDepth(99990);
    this.jumpDots = [];
    for (let i = 0; i < this.maxJumps; i++) {
      const dot = this.add.circle(i * 25 - 25, 0, 8, 0xffd93c, 1)
        .setStrokeStyle(2, 0x000000);
      this.jumpDots.push(dot);
      this.jumpIndicator.add(dot);
    }
  }

  refreshPlayerHearts() {
    if (this.heartsContainer) {
      this.heartsContainer.removeAll(true);
    }
    for (let i = 0; i < this.playerHP; i++) {
      const heart = this.add.text(i * 36, 0, '❤️', { fontSize: '32px' }).setOrigin(0, 0.5);
      this.heartsContainer.add(heart);
    }
    const label = this.add.text(this.playerHP * 36 + 8, 0, 'GRACZ', {
      fontSize: '18px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0, 0.5);
    this.heartsContainer.add(label);
  }

  showIntroBanner() {
    const banner = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'BOSS FIGHT!', {
      fontSize: '72px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffd93c',
      stroke: '#000',
      strokeThickness: 8,
      shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 8, fill: true },
    }).setOrigin(0.5).setScale(0).setDepth(99999);
    Haptic.gameComplete?.();
    this.tweens.add({
      targets: banner,
      scale: 1.2,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(800, () => {
          this.tweens.add({
            targets: banner,
            scale: 0,
            alpha: 0,
            duration: 300,
            onComplete: () => banner.destroy(),
          });
        });
      },
    });
  }

  startFight() {
    if (this.fightOver) return;
    this.fightStarted = true;
    // V8: pierwszy atak natychmiast po starcie (zamiast czekać BOSS_ATTACK_INTERVAL),
    // żeby gracz nie mógł spamować ataków podczas "lagu" startu (~3s wcześniej).
    this.bossWindUpAndAttack();
    this.bossAttackTimer = this.time.addEvent({
      delay: BOSS_ATTACK_INTERVAL,
      callback: () => this.bossWindUpAndAttack(),
      loop: true,
    });
  }

  // === Player attack ===

  createInputHandlers() {
    this.swipeStartY = null;
    this.swipeStartX = null;
    this.swipeStartTime = null;

    this.input.on('pointerdown', (pointer) => {
      if (this.fightOver) return;
      this.swipeStartY = pointer.y;
      this.swipeStartX = pointer.x;
      this.swipeStartTime = this.time.now;
    });

    this.input.on('pointerup', (pointer) => {
      if (this.fightOver) return;
      if (this.swipeStartY === null) return;

      const dy = pointer.y - this.swipeStartY;
      const dx = pointer.x - this.swipeStartX;
      const dur = this.time.now - this.swipeStartTime;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const SWIPE_THRESHOLD = 50;
      const SWIPE_MAX_DUR = 600;
      const isSwipe = dist > SWIPE_THRESHOLD && dur < SWIPE_MAX_DUR;

      // Swipe DOWN = slide.
      if (isSwipe && dy > SWIPE_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
        this.swipeStartY = null;
        this.swipeStartX = null;
        return this.playerSlide();
      }

      // Tap zone — LEWA połowa = JUMP, PRAWA połowa = ATAK.
      const tapX = pointer.x;
      const screenW = this.scale.gameSize.width;
      if (tapX < screenW * 0.5) {
        this.playerJump();
      } else {
        this.playerAttack();
      }
      this.swipeStartY = null;
      this.swipeStartX = null;
    });
  }

  playerJump() {
    if (this.fightOver) return;
    // V5: triple jump — można wykonać max 3 razy zanim wylądujesz.
    if (this.jumpCount >= this.maxJumps) return;

    this.jumpCount++;
    this.playerInvulnerable = true;
    this.refreshJumpIndicator();

    const jumpAnim = `${this.playerCharKey}_jump`;
    if (this.anims.exists(jumpAnim)) this.playerSprite.play(jumpAnim, true);

    // Każdy kolejny jump skacze trochę niżej (1st: 120, 2nd: 100, 3rd: 80).
    const jumpHeight = this.jumpCount === 1 ? 120 : (this.jumpCount === 2 ? 100 : 80);
    const baseY = this.playerBaseY;
    const currentY = this.playerSprite.y;
    const targetY = currentY - jumpHeight;

    // Anuluj poprzedni jump tween żeby nie konfliktował.
    this.tweens.killTweensOf(this.playerSprite);

    this.tweens.add({
      targets: this.playerSprite,
      y: targetY,
      duration: 250,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        // Spadanie z powrotem do baseY.
        this.tweens.add({
          targets: this.playerSprite,
          y: baseY,
          duration: 280,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            // Wylądował → reset jump counter, wraca do idle.
            this.jumpCount = 0;
            this.playerInvulnerable = false;
            this.refreshJumpIndicator();
            if (!this.fightOver) this.playerSprite.play(`${this.playerCharKey}_idle`);
          },
        });
      },
    });

    this.spawnJumpDust();
    Haptic.jump?.();
  }

  spawnJumpDust() {
    for (let i = 0; i < 5; i++) {
      const x = this.playerSprite.x + Phaser.Math.Between(-20, 20);
      const y = this.playerBaseY + 5;
      const p = this.add.circle(x, y, Phaser.Math.Between(2, 4), 0xcccccc, 0.8).setDepth(50);
      this.tweens.add({
        targets: p,
        y: y + 20,
        x: x + Phaser.Math.Between(-30, 30),
        alpha: 0,
        duration: 400,
        ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  refreshJumpIndicator() {
    if (!this.jumpDots) return;
    this.jumpDots.forEach((dot, i) => {
      dot.setFillStyle(i < (this.maxJumps - this.jumpCount) ? 0xffd93c : 0x444444);
    });
  }

  playerSlide() {
    if (this.fightOver) return;
    if (this.playerInvulnerable) return;
    this.playerInvulnerable = true;

    const rollAnim = `${this.playerCharKey}_roll`;
    if (this.anims.exists(rollAnim)) this.playerSprite.play(rollAnim, true);

    const baseScaleY = this.playerSprite.scaleY;
    this.tweens.add({
      targets: this.playerSprite,
      scaleY: baseScaleY * 0.5,
      duration: 100,
      yoyo: true,
      hold: 400,
      onComplete: () => {
        this.playerSprite.scaleY = baseScaleY;
        this.playerInvulnerable = false;
        if (!this.fightOver) this.playerSprite.play(`${this.playerCharKey}_idle`);
      },
    });
    Haptic.slide?.();
  }

  showDodgeText() {
    const t = this.add.text(this.playerSprite.x, this.playerSprite.y - 100, 'DODGE!', {
      fontSize: '32px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#4ecdc4',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(99998);
    this.tweens.add({
      targets: t,
      y: t.y - 50,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  playerAttack() {
    if (!this.fightStarted) return; // V8: blokuj atak dopóki bos się nie odezwie.
    // V3: cooldown 600ms — spam-tap = mały shake postaci, brak ataku.
    const now = this.time.now;
    if (this.lastAttackTime && (now - this.lastAttackTime) < 600) {
      this.tweens.add({
        targets: this.playerSprite,
        x: this.playerSprite.x - 5,
        duration: 50,
        yoyo: true,
        repeat: 1,
      });
      return;
    }
    this.lastAttackTime = now;

    this.sound.play('boss_attack', { volume: 0.6 });

    // Anim hit może się przerwać kolejnym tapem (DPS player-controlled).
    const hitAnim = `${this.playerCharKey}_hit`;
    if (this.anims.exists(hitAnim)) {
      this.playerSprite.play(hitAnim, true);
      this.playerSprite.once('animationcomplete', () => {
        if (!this.fightOver) {
          this.playerSprite.play(`${this.playerCharKey}_idle`);
        }
      });
    }

    this.bossHP = Math.max(0, this.bossHP - PLAYER_DAMAGE);
    this.refreshBossHP();

    // V3: MOCNE efekty trafień.
    this.spawnHitSparkles();
    this.spawnHitImpact();
    this.cameras.main.shake(200, 0.008);
    this.cameras.main.flash(80, 255, 100, 100, false);
    Haptic.crash?.();

    // Slow-mo 150ms dla dramy.
    this.time.timeScale = 0.6;
    this.tweens.timeScale = 0.6;
    setTimeout(() => {
      this.time.timeScale = 1.0;
      this.tweens.timeScale = 1.0;
    }, 150);

    this.bossSprite.setTint(0xff3b3b);
    this.time.delayedCall(150, () => {
      try { this.bossSprite.clearTint(); } catch (e) { /* ignore */ }
    });

    if (this.bossHP <= 0) this.handleVictory();
  }

  spawnHitImpact() {
    const ix = this.bossSprite.x;
    const iy = this.bossSprite.y - this.bossSprite.displayHeight * 0.3;

    // Wielki impact circle.
    const impact = this.add.circle(ix, iy, 80, 0xffd93c, 0.8).setDepth(99997);
    this.tweens.add({
      targets: impact,
      scale: 2.5,
      alpha: 0,
      duration: 350,
      ease: 'Cubic.easeOut',
      onComplete: () => impact.destroy(),
    });

    // 20 cząstek na zewnątrz.
    const colors = [0xffd93c, 0xff6b00, 0xff3300, 0xffffff, 0xffaa00];
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const dist = Phaser.Math.Between(80, 160);
      const tx = ix + Math.cos(angle) * dist;
      const ty = iy + Math.sin(angle) * dist;
      const p = this.add.circle(ix, iy, Phaser.Math.Between(5, 10), colors[i % 5]).setDepth(99998);
      this.tweens.add({
        targets: p, x: tx, y: ty, alpha: 0, scale: 0.2,
        duration: 500, ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }

    // "-10" floating damage text.
    const dmg = this.add.text(ix, iy - 60, '-10', {
      fontSize: '40px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffd93c',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(99999);
    this.tweens.add({
      targets: dmg, y: dmg.y - 60, alpha: 0, scale: 1.5,
      duration: 600, ease: 'Cubic.easeOut',
      onComplete: () => dmg.destroy(),
    });
  }

  spawnHitSparkles() {
    const colors = [0xff6b00, 0xffd93c, 0xffffff];
    const bx = this.bossSprite.x;
    const by = this.bossSprite.y - this.bossSprite.displayHeight * 0.3;
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dist = Phaser.Math.Between(50, 90);
      const tx = bx + Math.cos(angle) * dist;
      const ty = by + Math.sin(angle) * dist;
      const p = this.add.circle(bx, by, Phaser.Math.Between(4, 7), colors[i % 3])
        .setDepth(99998);
      this.tweens.add({
        targets: p, x: tx, y: ty, alpha: 0, scale: 0.3,
        duration: 400, ease: 'Cubic.easeOut',
        onComplete: () => p.destroy(),
      });
    }
  }

  refreshBossHP() {
    const ratio = this.bossHP / BOSS_HP_MAX;
    this.bossHPBar.scaleX = Math.max(0, ratio);
    this.bossHPText.setText(`BOSS ${this.bossHP}/100`);
    if (ratio > 0.5) this.bossHPBar.setFillStyle(0xff3b3b);
    else if (ratio > 0.25) this.bossHPBar.setFillStyle(0xffa500);
    else this.bossHPBar.setFillStyle(0xffd93c);
  }

  // === Boss attack ===

  bossWindUpAndAttack() {
    if (this.fightOver) return;

    const animKey = `${this.bossCharKey}_jump`;
    if (this.anims.exists(animKey)) this.bossSprite.play(animKey, true);

    this.bossSprite.setTint(0xffd93c);
    this.time.delayedCall(BOSS_WIND_UP_DURATION, () => {
      try { this.bossSprite.clearTint(); } catch (e) { /* ignore */ }
      if (!this.fightOver) this.bossAttack();
    });
  }

  bossAttack() {
    if (this.fightOver) return;

    const obstacleType = Math.random() < 0.5 ? 'stone' : 'spikes';
    const startX = this.bossSprite.x - 80;
    // V4: 50% low (gracz musi skoczyć) / 50% high (gracz musi slide).
    const isLowProjectile = Math.random() < 0.5;
    const projY = isLowProjectile ? GROUND_Y - 30 : GROUND_Y - 110;

    // V3: physics-based pocisk — leci dalej nawet jak gracz w jump/slide
    // (overlap NIE zniszczy pocisku gdy invulnerable, tylko brak trafienia).
    let projectile;
    if (this.textures.exists(obstacleType)) {
      projectile = this.physics.add.image(startX, projY, obstacleType).setScale(0.6);
    } else {
      projectile = this.physics.add.image(startX, projY, '__missing'); // fallback
      projectile.setVisible(false);
    }
    projectile.setDepth(50);
    projectile.alreadyHit = false;
    if (projectile.body) {
      projectile.body.setAllowGravity(false);
      projectile.body.setSize(40, 40);
      projectile.body.setVelocityX(-700); // px/s w lewo
    }

    // Overlap: gdy player invulnerable → pocisk PRZELATUJE; inaczej trafia.
    this.physics.add.overlap(this.playerSprite, projectile, () => {
      if (this.fightOver || projectile.alreadyHit) return;
      if (this.playerInvulnerable) return; // przelatuje pod/nad
      projectile.alreadyHit = true;
      this.handlePlayerHit();
      try { projectile.destroy(); } catch (e) { /* ignore */ }
    });

    // Lekka rotacja w trakcie lotu.
    this.tweens.add({
      targets: projectile,
      rotation: projectile.rotation + Math.PI * 4,
      duration: 1500,
      repeat: 0,
    });

    // Auto-cleanup safety net (3s).
    this.time.delayedCall(3000, () => {
      if (projectile && projectile.active) {
        try { projectile.destroy(); } catch (e) { /* ignore */ }
      }
    });

    this.activeProjectiles.push(projectile);

    this.bossSprite.once('animationcomplete', () => {
      if (!this.fightOver) {
        this.bossSprite.play(`${this.bossCharKey}_idle`);
      }
    });
  }

  update() {
    // V3: cleanup pocisków poza ekranem (lewa strona, gdy minęły gracza).
    if (!this.activeProjectiles) return;
    this.activeProjectiles = this.activeProjectiles.filter((p) => {
      if (!p || !p.active) return false;
      if (p.x < -100 || p.x > GAME_WIDTH + 100) {
        try { p.destroy(); } catch (e) { /* ignore */ }
        return false;
      }
      return true;
    });
  }

  handlePlayerHit() {
    if (this.fightOver) return;
    // V2: gracz w jump/slide → DODGE, brak utraty HP.
    if (this.playerInvulnerable) {
      this.showDodgeText();
      Haptic.coin?.();
      return;
    }
    this.sound.play('boss_player_hit', { volume: 0.5 });
    this.playerHP = Math.max(0, this.playerHP - 1);
    this.refreshPlayerHearts();

    this.playerSprite.setTint(0xff3b3b);
    this.time.delayedCall(300, () => {
      try { this.playerSprite.clearTint(); } catch (e) { /* ignore */ }
    });
    // V3: MOCNY hit + knockback + floating dmg text.
    this.cameras.main.shake(300, 0.012);
    this.cameras.main.flash(150, 255, 50, 50, false);
    Haptic.crash?.();

    const baseX = this.playerSprite.x;
    this.tweens.add({
      targets: this.playerSprite,
      x: baseX - 30,
      duration: 100,
      yoyo: true,
      ease: 'Cubic.easeOut',
    });

    const dmgText = this.add.text(this.playerSprite.x, this.playerSprite.y - 100, '-1 ❤️', {
      fontSize: '32px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ff3b3b',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(99998);
    this.tweens.add({
      targets: dmgText,
      y: dmgText.y - 60,
      alpha: 0,
      duration: 700,
      onComplete: () => dmgText.destroy(),
    });

    if (this.playerHP <= 0) this.handleDefeat();
  }

  // === End states ===

  handleVictory() {
    if (this.fightOver) return;
    this.fightOver = true;
    if (this.bossAttackTimer) { this.bossAttackTimer.destroy(); this.bossAttackTimer = null; }

    this.sound.play('boss_victory', { volume: 0.8 });

    const fallAnim = `${this.bossCharKey}_fall`;
    if (this.anims.exists(fallAnim)) this.bossSprite.play(fallAnim);

    this.tweens.add({
      targets: this.bossSprite,
      alpha: 0.3,
      angle: 90,
      y: this.bossSprite.y + 30,
      duration: 800,
    });

    // Bonus +500 do score (player.score, nie totalScore — to nasz field).
    const player = sessionManager.currentPlayer();
    if (player) player.score = (player.score || 0) + 500;

    this.time.delayedCall(800, () => {
      const banner = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'VICTORY!\n+500 PKT', {
        fontSize: '64px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#ffd93c',
        stroke: '#000',
        strokeThickness: 8,
        align: 'center',
      }).setOrigin(0.5).setScale(0).setDepth(99999);
      Haptic.gameComplete?.();
      this.tweens.add({ targets: banner, scale: 1.2, duration: 400, ease: 'Back.easeOut' });

      this.time.delayedCall(2000, () => {
        // Wracamy do LevelComplete z bonusem +500 dorzuconym do scoreThisLevel.
        const sd = this.fromSceneData || {};
        this.scene.start('LevelCompleteScene', {
          ...sd,
          scoreThisLevel: (sd.scoreThisLevel || 0) + 500,
          bossDefeated: true,
        });
      });
    });
  }

  handleDefeat() {
    if (this.fightOver) return;
    this.fightOver = true;
    if (this.bossAttackTimer) { this.bossAttackTimer.destroy(); this.bossAttackTimer = null; }

    const fallAnim = `${this.playerCharKey}_fall`;
    if (this.anims.exists(fallAnim)) this.playerSprite.play(fallAnim);

    this.time.delayedCall(500, () => {
      const banner = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'DEFEAT!\nSPROBUJ ZNOW', {
        fontSize: '56px',
        fontFamily: 'Arial Black, sans-serif',
        color: '#ff3b3b',
        stroke: '#000',
        strokeThickness: 6,
        align: 'center',
      }).setOrigin(0.5).setScale(0).setDepth(99999);
      Haptic.gameOver?.();
      this.tweens.add({ targets: banner, scale: 1.2, duration: 400, ease: 'Back.easeOut' });

      this.time.delayedCall(2500, () => {
        // Restart L1: reset lives + level=0.
        const player = sessionManager.currentPlayer();
        if (player) {
          player.lives = INITIAL_LIVES;
          player.level = 0;
        }
        this.scene.start('GameScene');
      });
    });
  }
}
