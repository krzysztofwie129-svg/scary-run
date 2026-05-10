// Ground (sesja 7.4.4) — wizualny pas trawy generowany w kodzie, BEZ tile
// textures. Zwykłe Phaser rectangles:
//   • dark soil pas od GROUND_Y+10 do dołu (cała wysokość poniżej ground line)
//   • cienki grass top edge na samym GROUND_Y+10 (jasna kreska)
//
// Dlaczego nie polegamy na parallax: bottom layer parallax to art z CraftPix
// gdzie ground line nie zawsze trafia na nasz GROUND_Y (=620). Bez własnego
// pasa player wizualnie lewitował.
//
// Player.body clampuje się przy GROUND_Y+10 przez setBoundsRectangle (Player.js)
// → body.blocked.down=true gdy spada → onGround=true. Pusty `this.group`
// zachowany dla GameScene `physics.add.collider(player, ground.group)` no-op.

import { GAME_WIDTH, GAME_HEIGHT, GROUND_Y } from '../config.js';

const GROUND_TOP_Y = GROUND_Y + 10;             // gdzie wizualny ground top
const SOIL_COLOR = 0x2d2540;                    // ciemny ciemnoFiolet (mroczne tło)
const GRASS_EDGE_COLOR = 0x4a7d2a;              // jasna kreska trawy na top edge
const GRASS_EDGE_HEIGHT = 4;                    // wysokość kreski trawy

export class Ground {
  constructor(scene) {
    this.scene = scene;

    const SOIL_THICKNESS = 1; // 1px — soil prawie niewidoczny, max widać tło levelu.
    this.soil = scene.add.rectangle(
      GAME_WIDTH / 2,
      GROUND_TOP_Y + SOIL_THICKNESS / 2,
      GAME_WIDTH,
      SOIL_THICKNESS,
      SOIL_COLOR,
    );
    this.soil.setDepth(2).setScrollFactor(0);

    // Zielona kreska usunięta (user feedback) — bez visible grass edge,
    // ground line wynika z bgFolder warstwy parallax.

    // Pusta physics group — collider w GameScene już istnieje na tej grupie,
    // pusta = no-op (kolizja graceful skipping).
    this.group = scene.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
  }

  update(_worldSpeed, _delta) {
    // No-op. Ground się nie przewija (paralaksa robi to w tle).
  }
}
