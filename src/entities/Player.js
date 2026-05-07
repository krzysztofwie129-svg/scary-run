// Player — postać gracza z fizyką, animacjami, prostą maszyną stanów.
// charKey to 'char01' / 'char02' / 'char03'. Animacje rejestrowane per-postać
// żeby klucze nie kolidowały (anims.create jest globalne dla całej gry).
//
// Sesja 3.5: + double jump (2 skoki), + slide (DOWN, obniżony hitbox),
// + landing grace counter (eliminuje drżenie 'fall'<->'run' po lądowaniu).

import {
  PHYSICS_GRAVITY,
  JUMP_VELOCITY,
  DOUBLE_JUMP_VELOCITY,
  ANIM_FRAME_COUNTS,
  CHARACTER_FRAME,
  CHARACTER_INFO,
  SLIDE_DURATION_MS,
  SLIDE_HITBOX_HEIGHT_RATIO,
  LANDING_GRACE_FRAMES,
} from '../config.js';

const pad2 = (n) => String(n).padStart(2, '0');

// Fallback body jeśli postać nie ma definicji w CHARACTER_INFO.body
// (nie powinno się zdarzyć — wszystkie 3 mają zdefiniowane).
const DEFAULT_BODY = { w: 140, h: 200, offsetX: 247, offsetY: 200 };

// Animacje — klucze pod jakimi rejestrujemy animacje per postać.
// 'roll' używamy jako ślizg (slide) — krótki, bez loopu.
const ANIMS = ['idle', 'run', 'jump', 'hit', 'fall', 'roll'];

// Frame rates per anim (żeby anim trwał roughly tyle ile ma sens akcyjnie).
const FRAME_RATES = {
  idle: 12,
  run: 30,
  jump: 24,
  fall: 12,
  hit: 30,  // 40 frames @ 30fps = 1.33s, daje czas na śmierć
  roll: 24, // 8 frames @ 24fps = 0.33s — szybki ślizg, slide trwa 600ms i nie zapętli
};

// Animacje które NIE loopują (jednorazowe).
const NON_LOOPING = new Set(['hit', 'roll']);

export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, charKey) {
    // Pierwsza klatka run jako początkowa tekstura.
    super(scene, x, y, `${charKey}_run_00`);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.charKey = charKey;
    // Phaser ma własne pole `.state` na GameObject (Phaser 3.50+) — używamy
    // state_ żeby się nie ścierać.
    this.state_ = 'running'; // running | jumping | falling | sliding | dead

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

    // Hitbox per-postać z CHARACTER_INFO.body (Hex jest węższa niż Fix/Mavix
    // — jednolity body powodował że kolizje rejestrowały się "w powietrzu"
    // obok niej). Jeśli brak definicji, fallback na średni body.
    const charInfo = CHARACTER_INFO.find((c) => c.key === charKey);
    const bodyDef = charInfo?.body ?? DEFAULT_BODY;
    this.body.setSize(bodyDef.w, bodyDef.h);
    this.body.setOffset(bodyDef.offsetX, bodyDef.offsetY);

    // Zachowujemy oryginalne wymiary body żeby slide() mógł je przywrócić
    // bez ryzyka kumulacji błędów po wielokrotnym slide.
    this.originalBodyHeight = this.body.height;
    this.originalBodyOffsetY = this.body.offset.y;

    // Klucze animacji — wstrzyknięte raz, używane wszędzie zamiast template
    // stringów (czytelniej + łatwo refaktorować).
    this.animKeys = this.setupAnimations(scene, charKey);

    this.play(this.animKeys.run);
  }

  setupAnimations(scene, charKey) {
    const animKeys = {};
    for (const anim of ANIMS) {
      const key = `${charKey}_${anim}`;
      animKeys[anim] = key;
      if (scene.anims.exists(key)) continue;
      const count = ANIM_FRAME_COUNTS[anim];
      const frames = [];
      for (let i = 0; i < count; i++) {
        frames.push({ key: `${charKey}_${anim}_${pad2(i)}` });
      }
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
    if (this.state_ === 'sliding') return;
    if (this.jumpsRemaining <= 0) return;

    const isFirstJump = this.jumpsRemaining === 2;
    this.setVelocityY(isFirstJump ? JUMP_VELOCITY : DOUBLE_JUMP_VELOCITY);
    this.jumpsRemaining--;
    this.state_ = 'jumping';
    this.play(this.animKeys.jump, true);
    // SFX — pierwszy skok normalny pitch, double jump lekko wyższy.
    this.scene.audioManager?.playSfx('jump', { rate: isFirstJump ? 1.0 : 1.15, volume: 0.7 });
    this.landingGraceCounter = 0;
  }

  slide() {
    // Można schylić się tylko biegnąc (nie w skoku, nie w spadaniu).
    if (this.state_ !== 'running') return;
    this.state_ = 'sliding';
    this.play(this.animKeys.roll, true);

    // Hitbox: zmniejszamy wysokość, podnosimy offset Y o różnicę żeby spód
    // (stopy) zostały na ziemi. NIGDY nie kumuluj — zawsze relative do
    // oryginałów zapisanych w konstruktorze.
    const newHeight = this.originalBodyHeight * SLIDE_HITBOX_HEIGHT_RATIO;
    this.body.setSize(this.body.width, newHeight);
    this.body.setOffset(this.body.offset.x, this.originalBodyOffsetY + (this.originalBodyHeight - newHeight));

    // Auto-restore po SLIDE_DURATION_MS. Sprawdzamy state_ żeby nie nadpisać
    // jeśli gracz w międzyczasie zmarł lub wszedł w inny stan.
    this.scene.time.delayedCall(SLIDE_DURATION_MS, () => {
      if (this.state_ !== 'sliding') return;
      this.body.setSize(this.body.width, this.originalBodyHeight);
      this.body.setOffset(this.body.offset.x, this.originalBodyOffsetY);
      this.state_ = 'running';
      this.play(this.animKeys.run, true);
    });
  }

  die() {
    if (this.state_ === 'dead') return;
    // Jeśli umarł w trakcie slide — przywróć body żeby kolizja z ziemią
    // dalej działała poprawnie (drobny ale mógłby kosztować bug w przyszłości).
    if (this.state_ === 'sliding') {
      this.body.setSize(this.body.width, this.originalBodyHeight);
      this.body.setOffset(this.body.offset.x, this.originalBodyOffsetY);
    }
    this.state_ = 'dead';
    this.setVelocityX(0);
    this.play(this.animKeys.hit, true);
    this.scene.events.emit('player-died');
  }

  isDead() {
    return this.state_ === 'dead';
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);

    if (this.state_ === 'dead') return;
    if (this.state_ === 'sliding') return; // ślizg trwa, anim/state nie zmieniaj

    const onGround = this.body.touching.down || this.body.blocked.down;

    if (onGround) {
      // Counter się dekrementuje — w trakcie grace nie odpalamy 'fall'->'run'
      // od nowa (anim run już leci jeśli wróciliśmy z grace), ale jeśli
      // w grace damy SPACE to jump() i tak zadziała (sprawdza touching.down).
      if (this.landingGraceCounter > 0) this.landingGraceCounter--;

      if (this.state_ !== 'running') {
        const wasAirborne = this.state_ === 'falling' || this.state_ === 'jumping';
        this.state_ = 'running';
        this.play(this.animKeys.run, true);
        this.jumpsRemaining = 2;
        if (wasAirborne) {
          this.scene.audioManager?.playSfx('landing', { volume: 0.5 });
        }
      }
    } else {
      // W powietrzu. Jumping → fall przy opadaniu.
      if (this.body.velocity.y > 50 && this.state_ !== 'falling' && this.state_ !== 'jumping') {
        this.state_ = 'falling';
        this.play(this.animKeys.fall, true);
        this.landingGraceCounter = LANDING_GRACE_FRAMES;
      } else if (this.state_ === 'jumping' && this.body.velocity.y > 50) {
        // Po szczycie skoku przejdź na fall.
        this.state_ = 'falling';
        this.play(this.animKeys.fall, true);
        this.landingGraceCounter = LANDING_GRACE_FRAMES;
      }
      // Faza wznoszenia (vy < 0) — pozostaje 'jumping', anim jump leci.
    }
  }
}
