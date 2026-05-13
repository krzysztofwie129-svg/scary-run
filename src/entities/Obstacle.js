// Obstacle — przeszkoda na ścieżce, sunie w lewo razem ze światem.
// Naziemne: spikes / stone / wooden_barrel / wooden_box (origin 0.5, 1, na GROUND_Y).
// Wisząca: flying_pumpkin — config.floats=true, baseY w powietrzu, sin-fala.
// Stack:    high_box_stack — config.stackHeight=2 + baseTexture, dwa spritey
//           wooden_box jeden na drugim. Body spans pełną wysokość stacka.
//
// Body trzymamy w sync ze spritem ręcznie (updateFromGameObject) bo
// kolizje sprawdzamy własnym AABB checkiem w GameScene — patrz
// komentarz tam, dlaczego nie używamy Phaser arcade overlap.

import {
  OBSTACLE_TYPES,
  FLYING_PUMPKIN_FLOAT_AMPLITUDE,
  FLYING_PUMPKIN_FLOAT_SPEED,
} from '../config.js';

export class Obstacle extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, type) {
    const config = OBSTACLE_TYPES[type] || OBSTACLE_TYPES.stone;
    // Random variant (rock_01..08, fence_01..02) — losujemy texture przy spawnie.
    let visualTexture;
    if (config.randomVariant && config.baseTexture) {
      const idx = 1 + Math.floor(Math.random() * config.randomVariant);
      const padded = String(idx).padStart(2, '0');
      visualTexture = `${config.baseTexture}_${padded}`;
      // Fallback gdy textura missing — użyj baseTexture jako-is.
      if (!scene.textures.exists(visualTexture)) visualTexture = config.baseTexture;
    } else {
      visualTexture = config.baseTexture || type;
    }
    // CraftPix sprites mają transparent padding pod stopami (~30px source pixels).
    // Przy origin (0.5, 1) bottom sprite leży na config.y, ale visible character
    // feet są groundPadding * scale pikseli wyżej. Korygujemy y w dół o tę wartość
    // żeby visible feet były dokładnie na GROUND_Y line.
    const groundPad = config.groundPadding || 0;
    const adjustedY = config.floats ? config.y : config.y + groundPad * config.scale;
    // 2026-05-13: defensive — jeśli visualTexture absolutnie nie istnieje
    // (fallback też failed), użyj placeholder 'tile' żeby nie crashować.
    if (!scene.textures.exists(visualTexture)) {
      visualTexture = scene.textures.exists('tile') ? 'tile' : Object.keys(scene.textures.list)[0];
    }
    super(scene, x, adjustedY, visualTexture);
    scene.add.existing(this);

    // Animowane obstacles (cyclops, warior, bomber) — odpalamy anim po init.
    // 2026-05-13: try/catch — anim cache mógł być utworzony z phantom frames.
    if (config.animated && config.animKey && scene.anims.exists(config.animKey)) {
      try { this.play(config.animKey); } catch (_) {}
    }

    // FlipX TYLKO gdy config.faceLeft === true (default: bez flipu).
    // Goblin/Cartoon/Funny/V7/Basic Zombies — sprite oryginalnie OK (twarz w prawo).
    // Halloween Pack (necro/skeleton/ghost/troll/pzombie) — odwrotny facing,
    // potrzebuje flipa żeby patrzył na gracza.
    if (config.animated && config.faceLeft === true) {
      this.setFlipX(true);
    }

    this.type_ = type;
    this.config_ = config;
    this.baseY = config.floats ? config.y : undefined;

    if (config.floats) {
      this.setOrigin(0.5, 0.5);
    } else {
      this.setOrigin(0.5, 1);
    }
    this.setScale(config.scale);

    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    this.body.setImmovable(true);

    const tex = scene.textures.get(visualTexture).getSourceImage();
    const texW = tex.width;
    const texH = tex.height;
    const ratio = config.hitboxRatio;
    const margin = (1 - ratio) / 2;
    const stackHeight = config.stackHeight && config.stackHeight > 1 ? config.stackHeight : 1;

    // Per-axis hitbox + offset (z editora). Fallback do legacy hitboxRatio (square centered).
    const hbW = (typeof config.hitboxW === 'number') ? config.hitboxW : ratio;
    const hbH = (typeof config.hitboxH === 'number') ? config.hitboxH : ratio;
    const hbOffX = (typeof config.hitboxOffX === 'number') ? config.hitboxOffX : (1 - hbW) / 2;
    const hbOffY = (typeof config.hitboxOffY === 'number') ? config.hitboxOffY : (1 - hbH) / 2;

    if (stackHeight > 1) {
      // Body covers full stack. Offset Y wymaga custom obliczenia bo body
      // jest wyższy niż jeden sprite — patrz wyprowadzenie:
      //   body display top = sprite.y - N*texH*scale*(1+ratio)/2
      //   body offset Y = texH * (1 - N*(1+ratio)/2)
      // Dla N=2, ratio=0.9: offsetY = -115.2 (texture units), scale apply'uje Phaser.
      this.body.setSize(texW * ratio, texH * ratio * stackHeight);
      const offsetY = texH * (1 - stackHeight * (1 + ratio) / 2);
      this.body.setOffset(texW * margin, offsetY);

      // Dodatkowe sprite'y na górę (tylko wizualne, bez body).
      this.stackChildren = [];
      const oneDisplay = texH * config.scale;
      for (let i = 1; i < stackHeight; i++) {
        const top = scene.add.image(this.x, this.y - i * oneDisplay, visualTexture);
        top.setOrigin(0.5, 1);
        top.setScale(config.scale);
        top.setDepth(5);
        this.stackChildren.push(top);
      }
    } else {
      this.body.setSize(texW * hbW, texH * hbH);
      // Po setFlipX(true) sprite jest odbity horizontalnie; hitbox z editora
      // (gdzie user widział sprite w oryginalnym facingu w prawo) musi też być
      // zlustrowany żeby visible character pokrywał się z body.
      const isFlipped = config.animated && config.faceLeft === true;
      const finalOffX = isFlipped ? (texW * (1 - hbOffX - hbW)) : (texW * hbOffX);
      this.body.setOffset(finalOffX, texH * hbOffY);
    }

    this.setDepth(5);
  }

  update(worldSpeed, delta) {
    this.x -= worldSpeed * (delta / 1000);

    if (this.baseY !== undefined) {
      this.y = this.baseY + Math.sin(this.scene.time.now * FLYING_PUMPKIN_FLOAT_SPEED) * FLYING_PUMPKIN_FLOAT_AMPLITUDE;
    }

    // Sync stack children.
    if (this.stackChildren) {
      for (const child of this.stackChildren) {
        child.x = this.x;
      }
    }

    if (this.body) {
      this.body.updateFromGameObject();
    }

    if (this.x < -100) {
      this.destroyAll();
    }
  }

  destroyAll() {
    if (this.stackChildren) {
      for (const child of this.stackChildren) {
        try { child.destroy(); } catch (e) { /* ignore */ }
      }
      this.stackChildren = null;
    }
    this.destroy();
  }
}
