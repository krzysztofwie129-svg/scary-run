// Player — postać gracza z fizyką, animacjami, prostą maszyną stanów.
// charKey to 'char01' / 'char02' / 'char03'. Animacje rejestrowane per-postać
// żeby klucze nie kolidowały (anims.create jest globalne dla całej gry).
//
// Sesja 8: SLIDE USUNIĘTY — gameplay tylko skoki (single + double jump).
// Animacja roll została usunięta z animKeys (asset roll/* w public pozostaje
// niewyrzucany ale niewczytywany — patrz config.ANIM_FRAME_COUNTS bez 'roll').

import {
  PHYSICS_GRAVITY,
  JUMP_VELOCITY,
  DOUBLE_JUMP_VELOCITY,
  ANIM_FRAME_COUNTS,
  CHARACTER_FRAME,
  CHARACTER_INFO,
  LANDING_GRACE_FRAMES,
  GAME_WIDTH,
  GROUND_Y,
} from '../config.js';
import { Haptic } from '../utils/Haptic.js';

const pad2 = (n) => String(n).padStart(2, '0');

const DEFAULT_BODY = { w: 140, h: 200, offsetX: 247, offsetY: 200 };

// Animacje per postać — bez 'roll' (slide usunięty w sesji 8).
// dead/win — sesja 2026-05.
const ANIMS = ['idle', 'run', 'jump', 'hit', 'fall', 'dead', 'win'];

const FRAME_RATES = {
  idle: 12,
  run: 30,
  jump: 24,
  fall: 12,
  hit: 30, // 40 frames @ 30fps = 1.33s
  dead: 24, // 50 frames @ 24fps = ~2.1s (cofnięte na 24, delay po anim w GameScene/BossFight +400ms)
  win: 24,  // 30 frames @ 24fps = 1.25s (jak wyżej)
};

// Animacje które NIE loopują (jednorazowe).
const NON_LOOPING = new Set(['hit', 'dead', 'win']);

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, charKey) {
    super(scene, x, y, `${charKey}_run_00`);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.charKey = charKey;
    // states: running | jumping | falling | dead
    this.state_ = 'running';

    // Sesja C — flagi power-up'ów. Faktyczne efekty w GameScene; tutaj tylko
    // boolean state żeby inne systemy mogły szybko sprawdzić (np. anim tint).
    this.shieldActive = false;
    this.speedBoostActive = false;

    // Double jump — reset przy lądowaniu, dekrement w jump().
    this.jumpsRemaining = 2;

    // Landing grace — po wylądowaniu blokujemy chwilowe skoki anim z 'fall'
    // do 'run' przez parę klatek (touching.down miga przez 1-2 klatki przy
    // dotknięciu ground'a co powodowało drżenie animacji).
    this.landingGraceCounter = 0;

    this.setOrigin(CHARACTER_FRAME.originX, CHARACTER_FRAME.originY);
    this.setScale(0.5);

    // Fizyka.
    this.setGravityY(PHYSICS_GRAVITY);
    this.setCollideWorldBounds(true);
    this.setBounce(0);

    // Custom world bounds — body bottom clamped na GROUND_Y + GROUND_VISUAL_OFFSET.
    // GROUND_Y = 620 to top of ground tile, ale tile ma decoration grass top
    // ~10px wysokości; body offset (200, 200) z originY=0.6 daje body bottom
    // na texture y=400 ale visible character feet są na texture y~380 (10
    // texture / 5 display wyżej). Razem to ~10 display floating nad visible
    // ground line. Shift +10 w bounds rectangle koryguje obie różnice.
    this.body.setBoundsRectangle(new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GROUND_Y + 10));

    // Hitbox per-postać z CHARACTER_INFO.body (Hex jest węższa niż Fix/Mavix
    // — jednolity body powodował że kolizje rejestrowały się "w powietrzu"
    // obok niej). Jeśli brak definicji, fallback na średni body.
    const charInfo = CHARACTER_INFO.find((c) => c.key === charKey);
    const bodyDef = charInfo?.body ?? DEFAULT_BODY;
    this.body.setSize(bodyDef.w, bodyDef.h);
    this.body.setOffset(bodyDef.offsetX, bodyDef.offsetY);

    this.animKeys = this.setupAnimations(scene, charKey);
    this._safePlay(this.animKeys.run);
  }

  // 2026-05-13: defensywny play — wszystkie play(animKeys.X) muszą iść przez
  // ten helper. Inaczej jeśli frames missing (race PreloadScene vs PlayerSync),
  // animKeys.X = undefined → Phaser crash w rAF "u.key undefined".
  _safePlay(key, ignoreIfPlaying) {
    if (!key || !this.scene?.anims?.exists?.(key)) return;
    try { this.play(key, ignoreIfPlaying); } catch (e) { /* anim cache race */ }
  }

  setupAnimations(scene, charKey) {
    const animKeys = {};
    for (const anim of ANIMS) {
      const key = `${charKey}_${anim}`;
      if (scene.anims.exists(key)) { animKeys[anim] = key; continue; }
      const count = ANIM_FRAME_COUNTS[anim];
      const frames = [];
      let allFramesExist = true;
      for (let i = 0; i < count; i++) {
        const frameKey = `${charKey}_${anim}_${pad2(i)}`;
        if (!scene.textures.exists(frameKey)) { allFramesExist = false; break; }
        frames.push({ key: frameKey });
      }
      // Defensywnie skip jeśli któryś frame missing (np. skin char04-07 bez dead/win
      // załadowanych w preload). Bez sprawdzania Phaser create() bez frames →
      // crash przy play (currentFrame.duration undefined).
      if (!allFramesExist) continue;
      animKeys[anim] = key;
      scene.anims.create({
        key,
        frames,
        frameRate: FRAME_RATES[anim],
        repeat: NON_LOOPING.has(anim) ? 0 : -1,
      });
    }
    return animKeys;
  }

  jump() {
    if (this.state_ === 'dead') return;
    if (this.jumpsRemaining <= 0) return;

    const isFirstJump = this.jumpsRemaining === 2;
    this.setVelocityY(isFirstJump ? JUMP_VELOCITY : DOUBLE_JUMP_VELOCITY);
    this.jumpsRemaining--;
    this.state_ = 'jumping';
    this._safePlay(this.animKeys.jump, true);
    this.scene.audioManager?.playSfx('jump', { rate: isFirstJump ? 1.0 : 1.15, volume: 0.7 });
    Haptic.jump();
    this.landingGraceCounter = 0;
  }

  die() {
    if (this.state_ === 'dead') return;
    this.state_ = 'dead';
    this.setVelocityX(0);
    // Dead anim z fallbackiem na hit. Każda play() w try/catch — Phaser potrafi
    // wywalić "currentFrame.duration undefined" jeśli anim w cache ma 0 frames
    // (Sentry JAVASCRIPT-8, escalating na char04-07 preload race).
    const tryPlay = (key) => {
      if (!key || !this.scene?.anims?.exists?.(key)) return false;
      try { this.play(key, true); return true; } catch (e) { return false; }
    };
    tryPlay(this.animKeys.dead) || tryPlay(this.animKeys.hit);
    Haptic.crash();
    this.scene?.events?.emit?.('player-died');
  }

  win() {
    if (this.state_ === 'dead' || this.state_ === 'win') return;
    this.state_ = 'win';
    this.setVelocityX(0);
    const winKey = this.animKeys.win;
    if (winKey && this.scene?.anims?.exists?.(winKey)) {
      try { this.play(winKey, true); } catch (e) { /* anim cache race */ }
    }
  }

  isDead() {
    return this.state_ === 'dead';
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    // Po dead/win: state zamrożony, preUpdate skipuje state-machine żeby
    // run anim nie nadpisała dead/win (które są NON_LOOPING + jednorazowe).
    if (this.state_ === 'dead' || this.state_ === 'win') return;

    const onGround = this.body.touching.down || this.body.blocked.down;

    if (onGround) {
      if (this.landingGraceCounter > 0) this.landingGraceCounter--;

      if (this.state_ !== 'running') {
        const wasAirborne = this.state_ === 'falling' || this.state_ === 'jumping';
        this.state_ = 'running';
        this._safePlay(this.animKeys.run, true);
        this.jumpsRemaining = 2;
        if (wasAirborne) {
          this.scene.audioManager?.playSfx('landing', { volume: 0.5 });
        }
      }
    } else {
      // W powietrzu. Jumping → fall przy opadaniu.
      if (this.body.velocity.y > 50 && this.state_ !== 'falling' && this.state_ !== 'jumping') {
        this.state_ = 'falling';
        this._safePlay(this.animKeys.fall, true);
        this.landingGraceCounter = LANDING_GRACE_FRAMES;
      } else if (this.state_ === 'jumping' && this.body.velocity.y > 50) {
        this.state_ = 'falling';
        this._safePlay(this.animKeys.fall, true);
        this.landingGraceCounter = LANDING_GRACE_FRAMES;
      }
    }
  }
}
