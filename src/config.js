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
export const GROUND_Y = 620;

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

// Flying pumpkin — wisi w powietrzu, lewituje sin-falą.
export const FLYING_PUMPKIN_FLOAT_AMPLITUDE = 15;
export const FLYING_PUMPKIN_FLOAT_SPEED = 0.003;
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

// 4 levele po 30s każdy. parallaxSpeeds długość = bgLayerCount.
// Faktyczne liczby warstw: lvl1=9, lvl2=7, lvl3=6, lvl4=7 (sprawdzono w
// public/assets/backgrounds/levelN/). Speeds rozłożone od najgłębszej (0.05)
// do najbliższej (1.0) — najgłębsza ledwo się rusza, najbliższa biegnie ze
// światem.
// obstacleMix per level — sumy wag (low + mid + wall) muszą = 1.0.
// (Sesja 8: 'high' = flying_pumpkin usunięte ze spawnów po wyrzuceniu slide.)
// Spawner robi weighted random na bazie tych wartości.
export const LEVELS = [
  {
    id: 1,
    name: 'Graveyard',
    duration: 30,
    bgFolder: 'level1',
    bgLayerCount: 9,
    parallaxSpeeds: [0.05, 0.1, 0.18, 0.28, 0.4, 0.55, 0.7, 0.85, 1.0],
    obstacleMix: { low: 1.0, mid: 0.0, wall: 0.0 },
    obstacleSpawnRate: { min: 2.2, max: 3.2 },
    coinSpawnRate: { min: 0.7, max: 1.5 },
    diamondChance: 0.075,
    worldSpeed: 300,
    musicVolume: 0.0,
  },
  {
    id: 2,
    name: "Witch's Hill",
    duration: 30,
    bgFolder: 'level2',
    bgLayerCount: 7,
    parallaxSpeeds: [0.05, 0.1, 0.2, 0.35, 0.5, 0.7, 1.0],
    obstacleMix: { low: 0.5, mid: 0.4, wall: 0.1 },
    obstacleSpawnRate: { min: 1.8, max: 2.8 },
    coinSpawnRate: { min: 0.6, max: 1.3 },
    diamondChance: 0.12,
    worldSpeed: 360,
    musicVolume: 0.0,
  },
  {
    id: 3,
    name: 'Spider Forest',
    duration: 30,
    bgFolder: 'level3',
    bgLayerCount: 6,
    parallaxSpeeds: [0.05, 0.15, 0.3, 0.5, 0.75, 1.0],
    obstacleMix: { low: 0.4, mid: 0.4, wall: 0.2 },
    obstacleSpawnRate: { min: 1.5, max: 2.4 },
    coinSpawnRate: { min: 0.5, max: 1.2 },
    diamondChance: 0.18,
    worldSpeed: 430,
    musicVolume: 0.0,
  },
  {
    id: 4,
    name: "Witch's House",
    duration: 30,
    bgFolder: 'level4',
    bgLayerCount: 7,
    parallaxSpeeds: [0.05, 0.1, 0.2, 0.35, 0.5, 0.7, 1.0],
    obstacleMix: { low: 0.3, mid: 0.45, wall: 0.25 },
    obstacleSpawnRate: { min: 1.2, max: 2.0 },
    coinSpawnRate: { min: 0.5, max: 1.0 },
    diamondChance: 0.22,
    worldSpeed: 500,
    musicVolume: 0.0,
  },
];

// Coin / diamond.
export const COIN_SCORE = 1;
export const DIAMOND_SCORE = 5;
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
export const INITIAL_LIVES = 3;
export const MAX_LIVES = 5;
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
    types: ['spikes', 'stone'],
    properties: {
      // Większe scale niż wcześniej (~0.5 → 0.85+) — przeszkody lepiej
      // widoczne, mniej trywialne. y = GROUND_Y, origin (0.5, 1) sadza spód
      // na ziemi.
      spikes: { y: GROUND_Y, scale: 0.9, hitboxRatio: 0.85, floats: false, requiresAction: 'jump_only' },
      stone:  { y: GROUND_Y, scale: 0.85, hitboxRatio: 0.85, floats: false, requiresAction: 'jump_only' },
    },
  },
  mid: {
    types: ['wooden_box', 'wooden_barrel'],
    properties: {
      // Mid przeszkody — można przeskoczyć LUB przeturlać (slide). Hitbox
      // średniej wysokości daje fair grę dla obu opcji.
      wooden_box:    { y: GROUND_Y, scale: 0.55, hitboxRatio: 0.9, floats: false, requiresAction: 'jump_or_slide' },
      wooden_barrel: { y: GROUND_Y, scale: 0.55, hitboxRatio: 0.85, floats: false, requiresAction: 'jump_or_slide' },
    },
  },
  high: {
    types: ['flying_pumpkin'],
    properties: {
      // Wysoka — slide tylko (skok nie wystarczy żeby pod nią przejść).
      flying_pumpkin: { y: GROUND_Y - 200, scale: 0.5, hitboxRatio: 0.8, floats: true, requiresAction: 'slide_only' },
    },
  },
  // 'wall' = stack 2 wooden_box. Body spans full stack height. Wymaga skoku
  // (single jumpa, ale na granicy — gracz może potrzebować double jumpa).
  // Obstacle.js dodaje sibling sprite na top gdy stackHeight > 1.
  wall: {
    types: ['high_box_stack'],
    properties: {
      high_box_stack: { y: GROUND_Y, scale: 0.55, hitboxRatio: 0.9, floats: false, requiresAction: 'jump_only', stackHeight: 2, baseTexture: 'wooden_box' },
    },
  },
};

// Anti-overlap.
export const MIN_OBSTACLE_DISTANCE_X = 280;
// Po 'wall' wymusimy więcej przestrzeni — gracz potrzebuje czasu na lądowanie
// po double jumpie zanim trafi w kolejną przeszkodę.
export const MIN_OBSTACLE_DISTANCE_AFTER_WALL = 350;
export const AIR_GROUND_RULE = true;

// Multiplayer.
export const MAX_PLAYERS = 4;
export const PLAYER_TURN_SPLASH_DURATION_MS = 2000;
export const NAME_MAX_LENGTH = 12;
export const NAME_ALLOWED_CHARS_REGEX = /^[A-Za-z0-9 ]*$/;

// Leaderboard.
export const LEADERBOARD_KEY = 'scary_run_leaderboard_v1';
export const LEADERBOARD_MAX_ENTRIES = 10;

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
