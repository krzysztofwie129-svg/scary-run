// PowerUp — kolorowy orb pływający i pulsujący (sesja C). Texture
// generowana raz per typ przez Phaser graphics.generateTexture, reused
// dla wszystkich instancji tego typu. Body bez grawitacji + manual AABB
// w GameScene (jak Coin).

import { POWER_UP_CONFIG } from '../utils/PowerUpManager.js';

const ORB_RADIUS = 18;
const TEX_PADDING = 8; // miejsce na outer glow ring
const TEX_SIZE = (ORB_RADIUS + TEX_PADDING) * 2;

function ensureTexture(scene, type) {
  const key = `__powerup_${type}`;
  if (scene.textures.exists(key)) return key;

  const cfg = POWER_UP_CONFIG[type];
  const g = scene.add.graphics({ x: 0, y: 0 });
  const cx = TEX_SIZE / 2;
  const cy = TEX_SIZE / 2;

  // Outer glow ring (alpha 0.3)
  g.fillStyle(cfg.color, 0.3);
  g.fillCircle(cx, cy, ORB_RADIUS + 6);

  // Main orb body
  g.fillStyle(cfg.color, 1);
  g.fillCircle(cx, cy, ORB_RADIUS);

  // Top-left highlight
  g.fillStyle(0xffffff, 0.6);
  g.fillCircle(cx - 5, cy - 5, 5);

  // White border
  g.lineStyle(3, 0xffffff, 1);
  g.strokeCircle(cx, cy, ORB_RADIUS);

  g.generateTexture(key, TEX_SIZE, TEX_SIZE);
  g.destroy();
  return key;
}

export class PowerUp extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, type) {
    super(scene, x, y, ensureTexture(scene, type));
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.type = type;
    this.config = POWER_UP_CONFIG[type];
    this.baseY = y;

    this.setOrigin(0.5, 0.5);
    this.setDepth(7); // nad coinami (6), pod player (100)

    if (this.body) {
      this.body.setAllowGravity(false);
      this.body.setImmovable(true);
      this.body.setSize(TEX_SIZE * 0.9, TEX_SIZE * 0.9);
    }

    // Floating animation (yoyo +/-5px around baseY).
    scene.tweens.add({
      targets: this,
      y: this.baseY - 5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    // Subtle pulsing scale.
    scene.tweens.add({
      targets: this,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  update(worldSpeed, delta) {
    this.x -= worldSpeed * (delta / 1000);
    if (this.body) this.body.updateFromGameObject();
    if (this.x < -50) this.destroy();
  }
}
