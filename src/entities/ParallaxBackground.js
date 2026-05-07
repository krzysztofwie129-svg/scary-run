// ParallaxBackground — stos warstw paralaksy z indywidualnymi prędkościami.
// Każda warstwa to dwie kopie obrazka obok siebie + ręczne przewijanie.
// Najgłębsza warstwa rusza się najwolniej, najbliższa najszybciej (zwykle
// 1.0× worldSpeed).
//
// Skalowanie: każda warstwa rozciągana do GAME_WIDTH × GAME_HEIGHT (bez
// zachowania proporcji — większość art halloween_bg jest zaprojektowana
// w stosunku 16:9 lub bliskim, więc rozciąganie do 1280×720 nie psuje).

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export class ParallaxBackground {
  /**
   * @param {Phaser.Scene} scene
   * @param {string[]} layerKeys — od najgłębszej (renderowana pierwsza) do najbliższej.
   * @param {number[]} scrollSpeeds — mnożnik worldSpeed per warstwa (0.05..1.0).
   */
  constructor(scene, layerKeys, scrollSpeeds) {
    this.scene = scene;
    this.layers = [];

    if (layerKeys.length !== scrollSpeeds.length) {
      // Niejednakowe długości — bezpieczny fallback: użyj min().
      console.warn(`ParallaxBackground: layerKeys (${layerKeys.length}) != scrollSpeeds (${scrollSpeeds.length}). Trimming.`);
    }
    const count = Math.min(layerKeys.length, scrollSpeeds.length);

    // Depth ujemny żeby cała paralaksa była ZA wszystkimi gameplay objectami.
    // Najgłębsza warstwa (i=0) ma najniższy depth, najbliższa (i=count-1) ma
    // najwyższy ale wciąż ujemny. Dzięki temu obstacles (depth 5), coins (6),
    // finish line (7), player (100) zawsze są wizualnie przed tłem.
    const BASE_DEPTH = -100;
    for (let i = 0; i < count; i++) {
      const key = layerKeys[i];
      const speed = scrollSpeeds[i];

      const a = scene.add.image(0, 0, key);
      const b = scene.add.image(GAME_WIDTH, 0, key);
      for (const img of [a, b]) {
        img.setOrigin(0, 0);
        img.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
        img.setDepth(BASE_DEPTH + i); // -100 (najgłębsza) .. -100 + count-1 (najbliższa)
        img.setScrollFactor(0);
      }
      this.layers.push({ a, b, speed });
    }
  }

  update(worldSpeed, delta) {
    const dt = delta / 1000;
    for (const layer of this.layers) {
      const dx = worldSpeed * layer.speed * dt;
      layer.a.x -= dx;
      layer.b.x -= dx;
      if (layer.a.x + GAME_WIDTH <= 0) layer.a.x = layer.b.x + GAME_WIDTH;
      if (layer.b.x + GAME_WIDTH <= 0) layer.b.x = layer.a.x + GAME_WIDTH;
    }
  }

  destroy() {
    for (const layer of this.layers) {
      layer.a.destroy();
      layer.b.destroy();
    }
    this.layers.length = 0;
  }
}
