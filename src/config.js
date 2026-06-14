// Globalne stałe gry. Wszystkie sceny importują z tego pliku.
// Zmiana wartości tutaj = jeden punkt prawdy dla całej gry.

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

// Trzy postacie do wyboru w menu — każda z osobnym folderem assetów.
// PreloadScene ładuje sprite-sheety dla każdego klucza.
export const CHARACTER_KEYS = ['char01', 'char02', 'char03'];

// Fizyka — Phaser arcade physics, oś Y rośnie w dół.
export const PHYSICS_GRAVITY = 1500;

// Skok = ujemna prędkość Y. -900 daje wysokość ~270px przy gravity 1500.
export const JUMP_VELOCITY = -900;

// Drugi skok (powietrzny) — lżejszy niż pierwszy, klasyk platformerowy.
// -750 + już istniejąca prędkość pionowa = wydłuża zawis nie reset'ując.
export const DOUBLE_JUMP_VELOCITY = -750;

// Bazowa prędkość przewijania świata (px/s) — postać "biegnie" w prawo.
export const WORLD_SPEED = 350;

// Wzrost prędkości w czasie — co sekundę dolicza się ten przyrost do WORLD_SPEED.
// Po 30s rozgrywki: 350 + 30 * 5 = 500 px/s.
export const SPEED_INCREMENT_PER_SECOND = 5;

// Ścieżki bazowe do assetów (Vite serwuje public/ pod rootem,
// więc wystarczy 'assets/...').
export const ASSET_PATHS = {
  characters: {
    char01: 'assets/characters/char01',
    char02: 'assets/characters/char02',
    char03: 'assets/characters/char03',
  },
  tileset: {
    background: 'assets/tileset/background',
    ground: 'assets/tileset/ground',
    obstacles: 'assets/tileset/obstacles',
    collectables: 'assets/tileset/collectables',
    decoration: 'assets/tileset/decoration',
  },
};

// Metadane postaci do MenuScene + kalibracja hitboxa per postać.
// CraftPix nie rysuje wszystkich postaci w identycznym bbox — Hex (char02)
// jest wyraźnie węższa (~100 px) niż Fix/Mavix którzy mają miecze (~140 px).
// Body dopasowany per-postać żeby kolizje były fair dla każdej.
//
// body: w/h w pikselach textury 633×523, offset (x,y) = lewy-górny róg body
// w obrębie tej textury. Phaser scale'uje body razem ze sprite (scale 0.5).
export const CHARACTER_INFO = [
  { key: 'char01', name: 'Fix',   description: 'Cyber Ninja',
    body: { w: 140, h: 200, offsetX: 247, offsetY: 200 } },
  { key: 'char02', name: 'Hex',   description: 'Witchy Skater',
    body: { w: 100, h: 210, offsetX: 267, offsetY: 190 } },
  { key: 'char03', name: 'Mavix', description: 'Crimson Shadow',
    body: { w: 140, h: 200, offsetX: 247, offsetY: 200 } },
];

// Liczba klatek per animacja (jednakowa dla wszystkich 3 postaci CraftPix).
// Pliki nazwane: Character-<Anim>_NN.png. UWAGA: Roll używa 1-cyfrowego
// paddingu (Character-Roll_0..7), reszta używa 2-cyfrowego (Character-Idle_00..19).
// PreloadScene musi padować odpowiednio per-anim.
export const ANIM_FRAME_COUNTS = {
  idle: 20,
  run: 30,
  jump: 20,
  hit: 40,
  fall: 10,
  roll: 8,
  dead: 50,  // sesja 2026-05: śmierć od kolizji/bossa (Dead/Character-Dead_NN.png)
  win: 30,   // sesja 2026-05: wygrana levelu/bossa (Win/Character-Win_NN.png)
};

// Klatka PNG ma 633x523 ale właściwy sprite zajmuje ~8.6% pola,
// nieco poniżej środka. originY=0.6 sprawia że "stopy" postaci leżą
// w okolicy punktu origin — dzięki temu imię/opis pod sprite'em
// nie zachodzą wizualnie na nogi.
export const CHARACTER_FRAME = {
  width: 633,
  height: 523,
  originX: 0.5,
  originY: 0.6,
};

// === Gameplay (sesja 3) ===

// Pozycja startowa postaci. PLAYER_START_Y = stopy postaci, bo originY=0.6.
export const PLAYER_START_X = 250;
export const PLAYER_START_Y = 550;

// Top of ground — ground tile'y mają originY=0 więc tu zaczyna się ich górna
// krawędź. Player z fizyką spada póki nie dotknie body ground tile'a.
// 650 (z 620) — user feedback: obniż gracza + przeszkody o 30 px.
export const GROUND_Y = 650;

// Spawning przeszkód — losowe odstępy w sekundach.
// Z czasem odstępy się zmniejszają (rośnie trudność).
export const OBSTACLE_MIN_GAP = 1.2;
export const OBSTACLE_MAX_GAP = 2.5;
export const OBSTACLE_GAP_DECREASE_PER_SECOND = 0.005;

// Score — 10 pkt/sekunda przeżycia.
export const SCORE_PER_SECOND = 10;

// Po DIFFICULTY_RAMP_DURATION sekund prędkość świata = 1.8× początkowej.
export const DIFFICULTY_RAMP_DURATION = 60;

// Paralaksa — mnożniki prędkości względem worldSpeed.
// layer_00 (księżyc + zamek) ledwo się rusza, layer_01 (drzewa) szybciej.
// Ground biegnie z pełną prędkością — to po nim biegnie postać.
export const PARALLAX_LAYER0_SPEED = 0.2;
export const PARALLAX_LAYER1_SPEED = 0.5;
export const GROUND_SPEED_MULTIPLIER = 1.0;

// localStorage key dla hi-score (jedyne miejsce gdzie używamy LS).
export const HI_SCORE_KEY = 'scary_run_hi_score';

// === Sesja 3.5: double jump + slide ===

// Slide (schylenie) — postać zwija się w roll, hitbox krótszy.
export const SLIDE_DURATION_MS = 600;
export const SLIDE_HITBOX_HEIGHT_RATIO = 0.5;

// Po wylądowaniu blokujemy flip 'fall' -> 'run' przez N klatek żeby anim
// nie przeskakiwała przy mikro-bounce na styku body/ground (drżenie).
export const LANDING_GRACE_FRAMES = 3;

// Flying pumpkin / ghost / nietoperz — wisi w powietrzu, lewituje sin-falą.
// Amplitude 5 (z 15) + speed 0.0015 (z 0.003) = mniejsze "drganie", spokojniejszy float.
export const FLYING_PUMPKIN_FLOAT_AMPLITUDE = 0;
export const FLYING_PUMPKIN_FLOAT_SPEED = 0.0015;
// Po flying_pumpkin minimum 1.5s do następnej przeszkody — żeby nie spawnować
// kombinacji "ledwo zeskoczyłeś, a tu naziemna" (niesprawiedliwe).
export const FLYING_PUMPKIN_COOLDOWN_MS = 1500;

// Konfiguracja przeszkód — y w stosunku do GROUND_Y, scale do display size,
// hitboxRatio = procent textury który jest "fair" do kolizji.
// y: GROUND_Y - h żeby spód sprite'a (origin 0.5, 1) leżał na ziemi (lub
// w powietrzu dla floats). Wartości empirycznie po wyglądzie + balansie.
// y dla naziemnych = GROUND_Y (origin 0.5, 1 → spód na ziemi).
// y dla flying_pumpkin = baseY (origin 0.5, 0.5 → wycentrowane).
//
// Wysokości skalibrowane tak, żeby:
//   • naziemne (spikes/stone/barrel/box): body sięga ~28-73 px nad ziemią,
//     player body biegnący 518-618 nakłada się → wymaga SKOKU.
//     Player slide body 565-618 też nakłada się → slide nie wystarczy, trzeba skoczyć.
//   • flying_pumpkin: baseY=510 (110 nad ground), body Y ~496-554 (z amplitude 15).
//     Player run body 518-618 nakłada się przy każdej fazie oscylacji → wymaga SLIDE.
//     Player slide body 565-618 NIE nakłada się (gap min 11 px) → slide wystarczy.
// Płaski lookup wszystkich typów (Obstacle.js używa). Wartości pochodzą
// z OBSTACLE_TIERS poniżej (jeden punkt prawdy). Tutaj placeholder — pełna
// definicja po deklaracji OBSTACLE_TIERS, plus _flattenTiers().
export const OBSTACLE_TYPES = {};

// === Sesja 4: Levele, monety, finish line ===

// 7 leveli po 30s każdy (sesja 8). L1-L4 oryginalne, L5-L7 nowe ekstremalne
// reusing biomy z L2-L4. parallaxSpeeds długość = bgLayerCount.
// obstacleMix sumy = 1.0 (low + mid + high + wall). 'high' = flying_pumpkin —
// po sesji 7 (slide removed) wciąż grywalne: bieg POD pumpkin = no overlap
// (player body Y 530-630 vs pumpkin Y 404-436), tylko skok blisko pumpkin
// = ryzyko kolizji w fazie wznoszenia. Pumpkin staje się "nie skacz tutaj".
export const LEVELS = [
  // L1 — tutorial. TEST: nowe pojedyncze tło (level1_test) zamiast 9-warstwowej parallaksy.
  {
    id: 1,
    name: 'Graveyard',
    duration: 30,
    bgFolder: 'level1_test',
    bgLayerCount: 1,
    parallaxSpeeds: [1.0],
    obstacleMix: { low: 1.0, mid: 0.0, high: 0.0, wall: 0.0 },
    obstacleSpawnRate: { min: 1.62, max: 2.34 },
    coinSpawnRate: { min: 0.7, max: 1.5 },
    diamondChance: 0.075,
    // Rebalans 2026-06-14: L1-L7 znacznie wolniejsze (łatwiejszy start na
    // easy/normal). Łagodna krzywa 270→430, bez urwiska przed L8 (488).
    worldSpeed: 270,
    musicVolume: 0.0,
  },
  // L2 — sesja 9: łagodniejsza krzywa (+30 speed, więcej low/mid)
  {
    id: 2,
    name: "Witch's Hill",
    duration: 30,
    bgFolder: 'level2_test',
    bgLayerCount: 1,
    parallaxSpeeds: [1.0],
    obstacleMix: { low: 0.65, mid: 0.25, high: 0.07, wall: 0.03 },
    obstacleSpawnRate: { min: 1.44, max: 2.16 },
    coinSpawnRate: { min: 0.6, max: 1.3 },
    diamondChance: 0.12,
    worldSpeed: 295,
    musicVolume: 0.0,
  },
  // L3
  {
    id: 3,
    name: 'Spider Forest',
    duration: 30,
    bgFolder: 'level3_test',
    bgLayerCount: 1,
    parallaxSpeeds: [1.0],
    obstacleMix: { low: 0.55, mid: 0.30, high: 0.10, wall: 0.05 },
    obstacleSpawnRate: { min: 1.26, max: 1.98 },
    coinSpawnRate: { min: 0.55, max: 1.2 },
    diamondChance: 0.18,
    worldSpeed: 320,
    musicVolume: 0.0,
  },
  // L4
  {
    id: 4,
    name: "Witch's House",
    duration: 30,
    bgFolder: 'level4_test',
    bgLayerCount: 1,
    parallaxSpeeds: [1.0],
    obstacleMix: { low: 0.50, mid: 0.30, high: 0.13, wall: 0.07 },
    obstacleSpawnRate: { min: 1.17, max: 1.80 },
    coinSpawnRate: { min: 0.5, max: 1.1 },
    diamondChance: 0.22,
    worldSpeed: 345,
    musicVolume: 0.0,
  },
  // L5 — biom L2 reuse
  {
    id: 5,
    name: "Witch's Hill - Cursed",
    duration: 30,
    bgFolder: 'level5_test',
    bgLayerCount: 1,
    parallaxSpeeds: [1.0],
    obstacleMix: { low: 0.45, mid: 0.32, high: 0.15, wall: 0.08 },
    obstacleSpawnRate: { min: 1.08, max: 1.62 },
    coinSpawnRate: { min: 0.5, max: 1.0 },
    diamondChance: 0.25,
    worldSpeed: 370,
    musicVolume: 0.0,
  },
  // L6+ rebalance (Faza 2): speed +1% per level (od 473 baseline z L5),
  // obstacleSpawnRate -2% per level (krótszy interval = więcej obstacles),
  // obstacleMix shift: każdy level +2.5% wall, +1.5% high, redukcja low.
  // Trudność rośnie przez OBSTACLES (variety + density), nie przez speed.
  {
    // L6 — TEST MODE: TYLKO nowe monstery (×5 scale dla testu wizualnego).
    // obstacleTypesOverride — per-tier nadpisanie OBSTACLE_TIERS[tier].types[].
    id: 6, name: 'Spider Forest - Toxic', duration: 30,
    bgFolder: 'level6_test', bgLayerCount: 1, parallaxSpeeds: [1.0],
    obstacleMix: { low: 0.0, mid: 0.70, high: 0.10, wall: 0.20 },
    obstacleTypesOverride: {
      mid: ['cartoon_m1', 'cartoon_m2', 'cartoon_m3', 'cartoon_m5',
            'funny_m1', 'funny_m2', 'funny_m4', 'funny_m5',
            'v7_m1', 'v7_m3', 'v7_m5', 'archer'],
      high: ['cartoon_m4'],
      wall: ['funny_m3', 'v7_m2', 'v7_m4'],
    },
    obstacleSpawnRate: { min: 1.40, max: 2.00 },
    coinSpawnRate: { min: 0.45, max: 0.95 }, diamondChance: 0.28,
    worldSpeed: 400, musicVolume: 0.0,
  },
  {
    // L7 — TEST MODE: TYLKO 13 nowych halloween monsterów (necro/skeleton/
    // ghost/troll/zombies). 0% low, 60% mid (zombies), 20% high (ghosts), 20% wall (trolls).
    id: 7, name: "Witch's House - Hellfire", duration: 30,
    bgFolder: 'level7_test', bgLayerCount: 1, parallaxSpeeds: [1.0],
    obstacleMix: { low: 0.0, mid: 0.60, high: 0.20, wall: 0.20 },
    obstacleTypesOverride: {
      mid: ['necromancer_1', 'skeleton_1',
            'pzombie_1', 'pzombie_2', 'pzombie_3',
            'zombie_01', 'zombie_02'],
      high: ['ghost_1', 'ghost_2', 'ghost_3'],
      wall: ['troll_1', 'troll_2', 'troll_3'],
    },
    obstacleSpawnRate: { min: 1.40, max: 2.00 },
    coinSpawnRate: { min: 0.4, max: 0.9 }, diamondChance: 0.30,
    worldSpeed: 430, musicVolume: 0.0,
  },
  {
    id: 8, name: 'Dragon Dungeon', duration: 30,
    bgFolder: 'level8_test', bgLayerCount: 1, parallaxSpeeds: [1.0],
    obstacleMix: { low: 0.40, mid: 0.34, high: 0.16, wall: 0.10 },
    obstacleSpawnRate: { min: 1.20, max: 1.70 },
    coinSpawnRate: { min: 0.4, max: 0.85 }, diamondChance: 0.30,
    worldSpeed: 488, musicVolume: 0.0,
  },
  {
    id: 9, name: 'Dragon Lair', duration: 30,
    bgFolder: 'level9_test', bgLayerCount: 1, parallaxSpeeds: [1.0],
    obstacleMix: { low: 0.36, mid: 0.34, high: 0.18, wall: 0.12 },
    obstacleSpawnRate: { min: 1.10, max: 1.60 },
    coinSpawnRate: { min: 0.4, max: 0.85 }, diamondChance: 0.30,
    worldSpeed: 493, musicVolume: 0.0,
  },
  {
    id: 10, name: 'Cursed Catacombs', duration: 30,
    bgFolder: 'level10_test', bgLayerCount: 1, parallaxSpeeds: [1.0],
    obstacleMix: { low: 0.32, mid: 0.33, high: 0.20, wall: 0.15 },
    obstacleSpawnRate: { min: 1.00, max: 1.50 },
    coinSpawnRate: { min: 0.4, max: 0.85 }, diamondChance: 0.30,
    worldSpeed: 498, musicVolume: 0.0,
  },
  {
    id: 11, name: 'Dragon Throne', duration: 30,
    bgFolder: 'level11_test', bgLayerCount: 1, parallaxSpeeds: [1.0],
    obstacleMix: { low: 0.28, mid: 0.32, high: 0.22, wall: 0.18 },
    obstacleSpawnRate: { min: 0.95, max: 1.40 },
    coinSpawnRate: { min: 0.4, max: 0.85 }, diamondChance: 0.30,
    worldSpeed: 503, musicVolume: 0.0,
  },
  // L12-L21 — bg cycle z L1-L10. Faza 2 rebalance: speed +1% per level
  // (kontynuacja od L11=503), spawnRate -2% per level, obstacleMix coraz
  // więcej wall + high (gracz konfrontowany z trudniejszymi typami, nie
  // szybciej pędzącymi).
  {
    id: 12, name: 'Graveyard II', duration: 30, bgFolder: 'level1_test',
    bgLayerCount: 1, parallaxSpeeds: [1.0],
    obstacleMix: { low: 0.24, mid: 0.32, high: 0.23, wall: 0.21 },
    obstacleSpawnRate: { min: 0.90, max: 1.30 },
    coinSpawnRate: { min: 0.4, max: 0.85 }, diamondChance: 0.30,
    worldSpeed: 508, musicVolume: 0.0,
  },
  {
    id: 13, name: "Witch's Hill II", duration: 30, bgFolder: 'level2_test',
    bgLayerCount: 1, parallaxSpeeds: [1.0],
    obstacleMix: { low: 0.20, mid: 0.32, high: 0.24, wall: 0.24 },
    obstacleSpawnRate: { min: 0.85, max: 1.25 },
    coinSpawnRate: { min: 0.4, max: 0.85 }, diamondChance: 0.30,
    worldSpeed: 513, musicVolume: 0.0,
  },
  {
    id: 14, name: 'Spider Forest II', duration: 30, bgFolder: 'level3_test',
    bgLayerCount: 1, parallaxSpeeds: [1.0],
    obstacleMix: { low: 0.18, mid: 0.30, high: 0.25, wall: 0.27 },
    obstacleSpawnRate: { min: 0.80, max: 1.20 },
    coinSpawnRate: { min: 0.4, max: 0.85 }, diamondChance: 0.30,
    worldSpeed: 518, musicVolume: 0.0,
  },
  {
    id: 15, name: "Witch's House II", duration: 30, bgFolder: 'level4_test',
    bgLayerCount: 1, parallaxSpeeds: [1.0],
    obstacleMix: { low: 0.22, mid: 0.32, high: 0.24, wall: 0.22 },
    obstacleSpawnRate: { min: 0.95, max: 1.40 },
    coinSpawnRate: { min: 0.4, max: 0.85 }, diamondChance: 0.30,
    worldSpeed: 523, musicVolume: 0.0,
  },
  {
    id: 16, name: 'Cursed Cemetery', duration: 30, bgFolder: 'level5_test',
    bgLayerCount: 1, parallaxSpeeds: [1.0],
    obstacleMix: { low: 0.18, mid: 0.32, high: 0.25, wall: 0.25 },
    obstacleSpawnRate: { min: 0.90, max: 1.35 },
    coinSpawnRate: { min: 0.4, max: 0.85 }, diamondChance: 0.30,
    worldSpeed: 528, musicVolume: 0.0,
  },
  {
    id: 17, name: 'Toxic Forest II', duration: 30, bgFolder: 'level6_test',
    bgLayerCount: 1, parallaxSpeeds: [1.0],
    obstacleMix: { low: 0.15, mid: 0.30, high: 0.27, wall: 0.28 },
    obstacleSpawnRate: { min: 0.85, max: 1.25 },
    coinSpawnRate: { min: 0.4, max: 0.85 }, diamondChance: 0.30,
    worldSpeed: 534, musicVolume: 0.0,
  },
  {
    id: 18, name: 'Dark Manor II', duration: 30, bgFolder: 'level7_test',
    bgLayerCount: 1, parallaxSpeeds: [1.0],
    obstacleMix: { low: 0.12, mid: 0.28, high: 0.28, wall: 0.32 },
    obstacleSpawnRate: { min: 0.78, max: 1.18 },
    coinSpawnRate: { min: 0.4, max: 0.85 }, diamondChance: 0.30,
    worldSpeed: 539, musicVolume: 0.0,
  },
  {
    id: 19, name: 'Dragon Lair II', duration: 30, bgFolder: 'level8_test',
    bgLayerCount: 1, parallaxSpeeds: [1.0],
    obstacleMix: { low: 0.06, mid: 0.24, high: 0.30, wall: 0.40 },
    obstacleSpawnRate: { min: 0.55, max: 0.85 },
    coinSpawnRate: { min: 0.4, max: 0.85 }, diamondChance: 0.30,
    worldSpeed: 544, musicVolume: 0.0,
  },
  {
    id: 20, name: 'Dragon Dungeon II', duration: 30, bgFolder: 'level9_test',
    bgLayerCount: 1, parallaxSpeeds: [1.0],
    obstacleMix: { low: 0.05, mid: 0.22, high: 0.31, wall: 0.42 },
    obstacleSpawnRate: { min: 0.50, max: 0.80 },
    coinSpawnRate: { min: 0.4, max: 0.85 }, diamondChance: 0.30,
    worldSpeed: 550, musicVolume: 0.0,
  },
  // L21 — FINAL (gracz po ukończeniu → GameCompleteScene).
  {
    id: 21, name: 'Final Dungeon', duration: 30, bgFolder: 'level10_test',
    bgLayerCount: 1, parallaxSpeeds: [1.0],
    obstacleMix: { low: 0.04, mid: 0.20, high: 0.32, wall: 0.44 },
    obstacleSpawnRate: { min: 0.45, max: 0.75 },
    coinSpawnRate: { min: 0.4, max: 0.85 }, diamondChance: 0.30,
    worldSpeed: 555, musicVolume: 0.0,
  },
];

// Coin / diamond.
export const COIN_SCORE = 10;
export const DIAMOND_SCORE = 12;
export const COIN_PICKUP_PITCH = 1.0;
export const DIAMOND_PICKUP_PITCH = 1.5;
export const COIN_Y_RANGE = [GROUND_Y - 250, GROUND_Y - 80];
export const COIN_SCALE = 0.4;

// Finish line — sekwencja meta + wizualizacja.
export const FINISH_LINE_TRIGGER_BEFORE_END = 3.0;
export const FINISH_LINE_WIDTH = 80;
export const FINISH_LINE_HEIGHT = 600;
export const FINISH_LINE_CHECKER_SIZE = 40;
export const FINISH_LINE_FLAG_HEIGHT = 80;
export const FINISH_SLOWMO_FACTOR = 0.3;
export const FINISH_SLOWMO_DURATION = 500;

// Particles.
export const PARTICLE_CRASH_COUNT = 12;
export const PARTICLE_CRASH_COLOR = 0xff3030;
export const PARTICLE_COIN_COUNT = 6;
export const PARTICLE_COIN_COLOR = 0xffd93c;
export const PARTICLE_DIAMOND_COUNT = 8;
export const PARTICLE_DIAMOND_COLOR = 0x4ad8ff;

// HUD.
export const HUD_FONT_SIZE = 28;
export const HUD_PROGRESS_BAR_HEIGHT = 6;
export const HUD_PROGRESS_BAR_WIDTH = 1200;

// localStorage key dla totalu (po przejściu wszystkich 4 leveli).
export const HI_TOTAL_SCORE_KEY = 'scary_run_hi_total_score';

// === Sesja 5: życia, multiplayer, leaderboard ===

// Życia. Strata = restart tego samego levelu z 1 życiem mniej (NIE od początku).
export const INITIAL_LIVES = 1; // 1 życie 1 szansa.
export const MAX_LIVES = 9;
export const COINS_PER_EXTRA_LIFE = 50;
export const LIFE_LOST_INVULN_MS = 0;

// Trzy tiery przeszkód — różne wysokości wymagają różnych akcji.
// 'low' = przeskok wystarczy lub slide
// 'mid' = wymaga normalnego skoku
// 'high' = wymaga slide (lewitujące, nad ziemią)
//
// y to środek X dla naziemnych (origin (0.5, 1) → bottom na GROUND_Y - margin),
// dla floats y to baseY (origin 0.5, 0.5 → wycentrowane).
// requiresAction:
//   'jump_only'  — slide NIE pomaga (low/mid/wall na ziemi, ciało w slidzie
//                  nadal dotyka). Single jump musi pokonać wysokość.
//   'slide_only' — wysoka latająca przeszkoda; skok nie wystarczy by przejść
//                  pod nią, slide jedyny ratunek.
//   (jump_or_slide nie używamy — zbyt łatwy poziom).
export const OBSTACLE_TIERS = {
  low: {
    // rock USUNIĘTY z spawn pool (user feedback: "zielone kamyczki" do usunięcia).
    types: ['spikes', 'stone'],
    properties: {
      spikes: { y: GROUND_Y + 10, scale: 0.9, hitboxRatio: 0.85, floats: false, requiresAction: 'jump_only' },
      stone:  { y: GROUND_Y + 10, scale: 0.85, hitboxRatio: 0.85, floats: false, requiresAction: 'jump_only' },
      rock:   { y: GROUND_Y + 10, scale: 0.7, hitboxRatio: 0.80, floats: false, requiresAction: 'jump_only', randomVariant: 8, baseTexture: 'rock' /* placeholder, runtime picks rock_01..08 */ },
    },
  },
  mid: {
    // 7 mid: 2 statyczne, 5 animowanych (cartoon/funny/v7/archer/warior).
    // tombstone USUNIĘTY z spawn pool (user feedback).
    types: ['wooden_box', 'wooden_barrel', 'warior',
      'cartoon_m1', 'cartoon_m2', 'cartoon_m3', 'cartoon_m5',
      'funny_m1', 'funny_m2', 'funny_m4', 'funny_m5',
      'v7_m1', 'v7_m3', 'v7_m5', 'archer',
      'necromancer_1', 'skeleton_1',
      'pzombie_1', 'pzombie_2', 'pzombie_3',
      'zombie_01', 'zombie_02'],
    properties: {
      wooden_box:    { y: GROUND_Y + 10, scale: 0.69, hitboxRatio: 0.9, floats: false, requiresAction: 'jump_or_slide' },
      wooden_barrel: { y: GROUND_Y + 10, scale: 0.86, hitboxRatio: 0.85, floats: false, requiresAction: 'jump_or_slide' },
      tombstone:     { y: GROUND_Y + 10, scale: 0.45, hitboxRatio: 0.80, floats: false, requiresAction: 'jump_or_slide' },
      warior:        { y: GROUND_Y + 10, scale: 0.75, floats: false, requiresAction: 'jump_or_slide', animated: true, groundPadding: 30, animKey: 'warior_run', baseTexture: 'warior_run_00', hitboxW: 0.253, hitboxH: 0.716, hitboxOffX: 0.277, hitboxOffY: 0.169 },
      cartoon_m1:    { y: GROUND_Y + 10, scale: 2.25, floats: false, requiresAction: 'jump_or_slide', animated: true, groundPadding: 30, animKey: 'cartoon_m1_anim', baseTexture: 'cartoon_m1_00', hitboxW: 0.324, hitboxH: 0.366, hitboxOffX: 0.319, hitboxOffY: 0.436 },
      cartoon_m2:    { y: GROUND_Y + 10, scale: 2.25, floats: false, requiresAction: 'jump_or_slide', animated: true, groundPadding: 30, animKey: 'cartoon_m2_anim', baseTexture: 'cartoon_m2_00', hitboxW: 0.32, hitboxH: 0.383, hitboxOffX: 0.315, hitboxOffY: 0.448 },
      cartoon_m3:    { y: GROUND_Y + 10, scale: 2.25, floats: false, requiresAction: 'jump_or_slide', animated: true, groundPadding: 30, animKey: 'cartoon_m3_anim', baseTexture: 'cartoon_m3_00', hitboxW: 0.403, hitboxH: 0.337, hitboxOffX: 0.273, hitboxOffY: 0.523 },
      cartoon_m5:    { y: GROUND_Y + 10, scale: 2.25, floats: false, requiresAction: 'jump_or_slide', animated: true, groundPadding: 30, animKey: 'cartoon_m5_anim', baseTexture: 'cartoon_m5_00', hitboxW: 0.266, hitboxH: 0.349, hitboxOffX: 0.332, hitboxOffY: 0.469 },
      funny_m1:      { y: GROUND_Y + 10, scale: 2.25, floats: false, requiresAction: 'jump_or_slide', animated: true, groundPadding: 30, animKey: 'funny_m1_anim', baseTexture: 'funny_m1_00', hitboxW: 0.245, hitboxH: 0.32, hitboxOffX: 0.444, hitboxOffY: 0.452 },
      funny_m2:      { y: GROUND_Y + 10, scale: 2.25, floats: false, requiresAction: 'jump_or_slide', animated: true, groundPadding: 30, animKey: 'funny_m2_anim', baseTexture: 'funny_m2_00', hitboxW: 0.195, hitboxH: 0.328, hitboxOffX: 0.461, hitboxOffY: 0.465 },
      funny_m4:      { y: GROUND_Y + 10, scale: 2.25, floats: false, requiresAction: 'jump_or_slide', animated: true, groundPadding: 30, animKey: 'funny_m4_anim', baseTexture: 'funny_m4_00', hitboxW: 0.187, hitboxH: 0.274, hitboxOffX: 0.49, hitboxOffY: 0.452 },
      funny_m5:      { y: GROUND_Y + 10, scale: 2.25, floats: false, requiresAction: 'jump_or_slide', animated: true, groundPadding: 30, animKey: 'funny_m5_anim', baseTexture: 'funny_m5_00', hitboxW: 0.178, hitboxH: 0.32, hitboxOffX: 0.44, hitboxOffY: 0.427 },
      v7_m1:         { y: GROUND_Y + 10, scale: 2.25, floats: false, requiresAction: 'jump_or_slide', animated: true, groundPadding: 30, animKey: 'v7_m1_anim', baseTexture: 'v7_m1_00', hitboxW: 0.303, hitboxH: 0.324, hitboxOffX: 0.352, hitboxOffY: 0.457 },
      v7_m3:         { y: GROUND_Y + 10, scale: 2.25, floats: false, requiresAction: 'jump_or_slide', animated: true, groundPadding: 30, animKey: 'v7_m3_anim', baseTexture: 'v7_m3_00', hitboxW: 0.27, hitboxH: 0.291, hitboxOffX: 0.403, hitboxOffY: 0.486 },
      v7_m5:         { y: GROUND_Y + 10, scale: 2.25, floats: false, requiresAction: 'jump_or_slide', animated: true, groundPadding: 30, animKey: 'v7_m5_anim', baseTexture: 'v7_m5_00', hitboxW: 0.212, hitboxH: 0.345, hitboxOffX: 0.465, hitboxOffY: 0.415 },
      archer:        { y: GROUND_Y + 10, scale: 0.53, floats: false, requiresAction: 'jump_or_slide', animated: true, groundPadding: 30, animKey: 'archer_anim', baseTexture: 'archer_00', hitboxW: 0.428, hitboxH: 0.516, hitboxOffX: 0.207, hitboxOffY: 0.257 },
      // Halloween pack (necro, skeleton, zombies) — mid tier (jump_or_slide).
      necromancer_1: { y: GROUND_Y + 10, scale: 3.50, floats: false, requiresAction: 'jump_or_slide', animated: true, faceLeft: true, groundPadding: 30, animKey: 'necromancer_1_anim', baseTexture: 'necromancer_1_00', hitboxW: 0.149, hitboxH: 0.207, hitboxOffX: 0.436, hitboxOffY: 0.453 },
      skeleton_1:    { y: GROUND_Y + 10, scale: 1.58, floats: false, requiresAction: 'jump_or_slide', animated: true, faceLeft: true, groundPadding: 30, animKey: 'skeleton_1_anim', baseTexture: 'skeleton_1_00', hitboxW: 0.307, hitboxH: 0.416, hitboxOffX: 0.407, hitboxOffY: 0.39 },
      pzombie_1:     { y: GROUND_Y + 10, scale: 1.58, floats: false, requiresAction: 'jump_or_slide', animated: true, faceLeft: true, groundPadding: 30, animKey: 'pzombie_1_anim', baseTexture: 'pzombie_1_00', hitboxW: 0.312, hitboxH: 0.778, hitboxOffX: 0.348, hitboxOffY: 0.14 },
      pzombie_2:     { y: GROUND_Y + 10, scale: 1.58, floats: false, requiresAction: 'jump_or_slide', animated: true, faceLeft: true, groundPadding: 30, animKey: 'pzombie_2_anim', baseTexture: 'pzombie_2_00', hitboxW: 0.228, hitboxH: 0.816, hitboxOffX: 0.361, hitboxOffY: 0.107 },
      pzombie_3:     { y: GROUND_Y + 10, scale: 1.58, floats: false, requiresAction: 'jump_or_slide', animated: true, faceLeft: true, groundPadding: 30, animKey: 'pzombie_3_anim', baseTexture: 'pzombie_3_00', hitboxW: 0.232, hitboxH: 0.82, hitboxOffX: 0.369, hitboxOffY: 0.09 },
      zombie_01:     { y: GROUND_Y + 10, scale: 1.62, floats: false, requiresAction: 'jump_or_slide', animated: true, groundPadding: 30, animKey: 'zombie_01_anim', baseTexture: 'zombie_01_00', hitboxW: 0.333, hitboxH: 0.732, hitboxOffX: 0.352, hitboxOffY: 0.152 },
      zombie_02:     { y: GROUND_Y + 10, scale: 1.62, floats: false, requiresAction: 'jump_or_slide', animated: true, groundPadding: 30, animKey: 'zombie_02_anim', baseTexture: 'zombie_02_00', hitboxW: 0.287, hitboxH: 0.703, hitboxOffX: 0.307, hitboxOffY: 0.198 },
    },
  },
  high: {
    // 3 high: pumpkin, bomber, cartoon_m4 (nietoperz lata).
    types: ['flying_pumpkin', 'bomber', 'cartoon_m4', 'ghost_1', 'ghost_2', 'ghost_3'],
    properties: {
      flying_pumpkin: { y: GROUND_Y - 200, scale: 0.5, hitboxRatio: 0.8, floats: true, requiresAction: 'slide_only' },
      bomber:         { y: GROUND_Y - 160, scale: 1.42, floats: true, requiresAction: 'slide_only', animated: true, animKey: 'bomber_fly', baseTexture: 'bomber_fly_00', hitboxW: 0.325, hitboxH: 0.483, hitboxOffX: 0.287, hitboxOffY: 0.354 },
      cartoon_m4:     { y: GROUND_Y - 200, scale: 2.00, floats: true, requiresAction: 'slide_only', animated: true, animKey: 'cartoon_m4_anim', baseTexture: 'cartoon_m4_00', hitboxW: 0.342, hitboxH: 0.258, hitboxOffX: 0.292, hitboxOffY: 0.383 },
      // Ghosts (3 warianty) — latają, slide_only.
      ghost_1:        { y: GROUND_Y - 200, scale: 2.52, floats: true, requiresAction: 'slide_only', animated: true, faceLeft: true, animKey: 'ghost_1_anim', baseTexture: 'ghost_1_00', hitboxW: 0.167, hitboxH: 0.271, hitboxOffX: 0.433, hitboxOffY: 0.454 },
      ghost_2:        { y: GROUND_Y - 200, scale: 2.52, floats: true, requiresAction: 'slide_only', animated: true, faceLeft: true, animKey: 'ghost_2_anim', baseTexture: 'ghost_2_00', hitboxW: 0.162, hitboxH: 0.271, hitboxOffX: 0.425, hitboxOffY: 0.429 },
      ghost_3:        { y: GROUND_Y - 200, scale: 2.52, floats: true, requiresAction: 'slide_only', animated: true, faceLeft: true, animKey: 'ghost_3_anim', baseTexture: 'ghost_3_00', hitboxW: 0.171, hitboxH: 0.258, hitboxOffX: 0.438, hitboxOffY: 0.458 },
    },
  },
  wall: {
    // 6 wall: 2 statyczne, 4 animowane (cyclops + 3 duże potwory).
    // fence USUNIĘTY z spawn pool (user feedback: "płotki" do usunięcia).
    types: ['high_box_stack', 'cyclops', 'funny_m3', 'v7_m2', 'v7_m4',
      'troll_1', 'troll_2', 'troll_3'],
    properties: {
      high_box_stack: { y: GROUND_Y + 10, scale: 0.69, hitboxRatio: 0.9, floats: false, requiresAction: 'jump_only', stackHeight: 2, baseTexture: 'wooden_box' },
      fence:          { y: GROUND_Y + 10, scale: 0.55, hitboxRatio: 0.80, floats: false, requiresAction: 'jump_only', randomVariant: 2, baseTexture: 'fence' },
      cyclops:        { y: GROUND_Y + 10, scale: 0.98, floats: false, requiresAction: 'jump_only', animated: true, groundPadding: 30, animKey: 'cyclops_idle', baseTexture: 'cyclops_idle_00', hitboxW: 0.713, hitboxH: 0.713, hitboxOffX: 0.133, hitboxOffY: 0.179 },
      funny_m3:       { y: GROUND_Y + 10, scale: 3.00, floats: false, requiresAction: 'jump_only', animated: true, groundPadding: 30, animKey: 'funny_m3_anim', baseTexture: 'funny_m3_00', hitboxW: 0.22, hitboxH: 0.337, hitboxOffX: 0.498, hitboxOffY: 0.419 },
      v7_m2:          { y: GROUND_Y + 10, scale: 3.00, floats: false, requiresAction: 'jump_only', animated: true, groundPadding: 30, animKey: 'v7_m2_anim', baseTexture: 'v7_m2_00', hitboxW: 0.22, hitboxH: 0.291, hitboxOffX: 0.415, hitboxOffY: 0.457 },
      v7_m4:          { y: GROUND_Y + 10, scale: 3.00, floats: false, requiresAction: 'jump_only', animated: true, groundPadding: 30, animKey: 'v7_m4_anim', baseTexture: 'v7_m4_00', hitboxW: 0.216, hitboxH: 0.307, hitboxOffX: 0.461, hitboxOffY: 0.473 },
      // Trolls (3 warianty) — duże stworzenia, wall (jump_only).
      troll_1:        { y: GROUND_Y + 10, scale: 2.28, floats: false, requiresAction: 'jump_only', animated: true, faceLeft: true, groundPadding: 30, animKey: 'troll_1_anim', baseTexture: 'troll_1_00', hitboxW: 0.229, hitboxH: 0.296, hitboxOffX: 0.438, hitboxOffY: 0.417 },
      troll_2:        { y: GROUND_Y + 10, scale: 2.28, floats: false, requiresAction: 'jump_only', animated: true, faceLeft: true, groundPadding: 30, animKey: 'troll_2_anim', baseTexture: 'troll_2_00', hitboxW: 0.233, hitboxH: 0.292, hitboxOffX: 0.454, hitboxOffY: 0.429 },
      troll_3:        { y: GROUND_Y + 10, scale: 2.28, floats: false, requiresAction: 'jump_only', animated: true, faceLeft: true, groundPadding: 30, animKey: 'troll_3_anim', baseTexture: 'troll_3_00', hitboxW: 0.242, hitboxH: 0.296, hitboxOffX: 0.438, hitboxOffY: 0.425 },
    },
  },
};

// Anti-overlap.
export const MIN_OBSTACLE_DISTANCE_X = 280;
// Po 'wall' wymusimy więcej przestrzeni — gracz potrzebuje czasu na lądowanie
// po double jumpie zanim trafi w kolejną przeszkodę. 500 (z 350) = ~1.0s
// gap przy worldSpeed 500 → starcza na full double jump cycle (jump 1.2s).
export const MIN_OBSTACLE_DISTANCE_AFTER_WALL = 500;
// Po 2 wallach pod rząd nie pozwól trzeciego (anti-cluster). Forsuje
// pickTier wybór non-wall jeśli lastObstacleTier='wall' i consecutiveWalls>=2.
export const MAX_CONSECUTIVE_WALLS = 2;
export const AIR_GROUND_RULE = true;

// Multiplayer.
export const MAX_PLAYERS = 4;
export const PLAYER_TURN_SPLASH_DURATION_MS = 2000;
export const NAME_MAX_LENGTH = 12;
export const NAME_ALLOWED_CHARS_REGEX = /^[A-Za-z0-9 ]*$/;

// Leaderboard.
export const LEADERBOARD_KEY = 'scary_run_leaderboard_v1';
export const LEADERBOARD_MAX_ENTRIES = 50;

// HUD.
export const HUD_LIFE_ICON_SIZE = 28;
export const HUD_COIN_ICON_SIZE = 24;

// Spłaszczamy OBSTACLE_TIERS do OBSTACLE_TYPES — Obstacle.js indeksuje
// po typie ('stone' / 'flying_pumpkin') bez znajomości tieru.
for (const tierName of Object.keys(OBSTACLE_TIERS)) {
  const tier = OBSTACLE_TIERS[tierName];
  for (const type of Object.keys(tier.properties)) {
    OBSTACLE_TYPES[type] = { ...tier.properties[type], tier: tierName };
  }
}
