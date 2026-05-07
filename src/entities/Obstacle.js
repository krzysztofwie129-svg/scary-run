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
    // Dla stack typów używamy baseTexture (np. 'wooden_box' jako wizualnego źródła).
    const visualTexture = config.baseTexture || type;
    super(scene, x, config.y, visualTexture);
    scene.add.existing(this);

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
      this.body.setSize(texW * ratio, texH * ratio);
      this.body.setOffset(texW * margin, texH * margin);
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
