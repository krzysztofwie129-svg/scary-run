// Coin — moneta lub diament do zebrania. Body bez grawitacji, bez kolizji
// fizycznej z ziemią; GameScene robi manualny AABB overlap z player.
// Coin animuje się (spinning frames), diamond bobbing góra-dół tweenem.

import {
  COIN_SCORE,
  DIAMOND_SCORE,
  COIN_SCALE,
} from '../config.js';

const COIN_ANIM_KEY = 'coin_spin';

export class Coin extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, isDiamond = false) {
    super(scene, x, y, isDiamond ? 'diamond' : 'coin_00');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.isDiamond = isDiamond;
    this.scoreValue = isDiamond ? DIAMOND_SCORE : COIN_SCORE;
    this.baseY = y;

    this.setOrigin(0.5, 0.5);
    this.setScale(COIN_SCALE);
    this.setDepth(6); // nad ground, pod player

    this.body.setAllowGravity(false);
    this.body.setImmovable(true);

    if (isDiamond) {
      // Bobbing góra-dół. Tween na sprite.y nadpisuje update() — w update
      // przesuwamy x manualnie, baseY tracking dba żeby tween nie konfliktował.
      scene.tweens.add({
        targets: this,
        y: this.baseY - 10,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      // Anim spin — tworzymy raz globalnie.
      if (!scene.anims.exists(COIN_ANIM_KEY)) {
        scene.anims.create({
          key: COIN_ANIM_KEY,
          frames: ['coin_00', 'coin_01', 'coin_02', 'coin_03', 'coin_05', 'coin_06']
            .map((k) => ({ key: k })),
          frameRate: 12,
          repeat: -1,
        });
      }
      this.play(COIN_ANIM_KEY);
    }
  }

  update(worldSpeed, delta) {
    this.x -= worldSpeed * (delta / 1000);
    // Body manual sync — bo manualnie ruszamy x (tween zarządza Y dla diamentu).
    if (this.body) this.body.updateFromGameObject();
    if (this.x < -50) this.destroy();
  }
}
