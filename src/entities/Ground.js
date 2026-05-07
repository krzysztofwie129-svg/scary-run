// Ground — pętla ziemi z object pool ground_*.png tiles.
// Tile'y ground_01..13 są 128×128, ground_additional_01..07 są 320×320 i inne
// kształty (skały na ziemi etc.) — używamy tylko podstawowych ground_01..13
// jako "powierzchnia do biegania", żeby nie psuć kolizji.
//
// Strategia:
//   • pula ceil(GAME_WIDTH/TILE) + 2 tile'ów rozłożonych w rzędzie
//   • każda klatka update() przesuwa wszystkie w lewo
//   • tile który wyszedł poza lewy ekran → przekładamy na koniec rzędu
//   • physics body immovable=true, allowGravity=false → solidna podłoga

import { GAME_WIDTH, GROUND_Y, GROUND_SPEED_MULTIPLIER } from '../config.js';

const TILE_SIZE = 128;

export class Ground {
  constructor(scene) {
    this.scene = scene;
    // Static group nie aktualizuje body przy ruchu, ale my chcemy ruszać
    // tile'ami i zachować kolizję — używamy zwykłej (dynamic) grupy z body
    // immovable=true + allowGravity=false. Po ruchu wołamy
    // body.updateFromGameObject() żeby odświeżyć pozycję body za sprite.
    this.group = scene.physics.add.group({
      allowGravity: false,
      immovable: true,
    });

    // Liczba tile'ów = ceil(width/tile) + 2 (bufor na recykling).
    const count = Math.ceil(GAME_WIDTH / TILE_SIZE) + 2;
    this.tiles = [];

    // Klucze ground_01..13 — tylko podstawowe (te są spójne stylistycznie).
    const keys = [];
    for (let i = 1; i <= 13; i++) {
      keys.push(`ground_${String(i).padStart(2, '0')}`);
    }

    for (let i = 0; i < count; i++) {
      const key = keys[Math.floor(Math.random() * keys.length)];
      const tile = this.group.create(i * TILE_SIZE, GROUND_Y, key);
      tile.setOrigin(0, 0);
      tile.setDisplaySize(TILE_SIZE, TILE_SIZE);
      // Body dopasowane do display size (Phaser auto-size'uje na podstawie
      // tekstury 128×128 — więc nie trzeba setSize).
      tile.body.setSize(TILE_SIZE, TILE_SIZE);
      tile.body.setOffset(0, 0);
      tile.setDepth(2); // nad parallax (depth 0/1), pod player/obstacles
      this.tiles.push(tile);
      this.tileKeys = keys;
    }
  }

  update(worldSpeed, delta) {
    const dx = worldSpeed * GROUND_SPEED_MULTIPLIER * (delta / 1000);
    for (const tile of this.tiles) {
      tile.x -= dx;
      // body chodzi za sprite (Phaser update'uje, bo allowGravity=false ale
      // immovable=true pozwala na ręczny ruch). Dla pewności:
      tile.body.updateFromGameObject();
    }
    // Recykling — przesuń tile'y które wyszły z ekranu na prawy koniec rzędu.
    // Najprawszy tile = max x, doczepiamy się tile_size za nim.
    let maxX = -Infinity;
    for (const tile of this.tiles) {
      if (tile.x > maxX) maxX = tile.x;
    }
    for (const tile of this.tiles) {
      if (tile.x + TILE_SIZE < 0) {
        tile.x = maxX + TILE_SIZE;
        maxX = tile.x;
        // Losujemy nową teksturę żeby zmiana wzoru była bardziej naturalna.
        const newKey = this.tileKeys[Math.floor(Math.random() * this.tileKeys.length)];
        tile.setTexture(newKey);
        tile.body.updateFromGameObject();
      }
    }
  }
}
