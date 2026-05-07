// PreloadScene — ładuje assety używane w MenuScene + GameScene MVP:
//   • postacie char01-03: animacje idle/run/jump/hit/fall (image sequence)
//   • tła: layer_00, layer_01
// Ground/obstacles/collectables doładujemy w sesji 3.
//
// Klucze tekstur pod jakimi assety lądują w cache:
//   <charKey>_<anim>_<NN>  np. char01_idle_00, char02_run_29, char03_hit_39
//   bg_layer_00, bg_layer_01

import { ASSET_PATHS, CHARACTER_KEYS, ANIM_FRAME_COUNTS, LEVELS } from '../config.js';
import { preloadMusic } from '../utils/AudioManager.js';

// Zero-pad number do 2 cyfr (CraftPix file naming).
const pad2 = (n) => String(n).padStart(2, '0');

// Capitalize pierwsza litera (folder lower-case, plik PNG Capitalized).
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload() {
    this.drawProgressBar();

    // Pre-fetch muzyki menu RÓWNOLEGLE z preloadem Phasera. HTMLAudio fetch
    // jest niezależny od Phaser load queue — startuje natychmiast, w trakcie
    // gdy Phaser ładuje obrazki/dźwięki SFX. Gdy MenuScene wystartuje, plik
    // już jest cały (lub większość) zbuforowany — brak laga przy starcie
    // .play().
    preloadMusic('music_menu');

    // Postacie — każda animacja jako sekwencja pojedynczych obrazków.
    // Phaser nie ma natywnego "load.imageSequence", więc pętla po klatkach.
    //
    // CraftPix kwiat:
    //  • Roll używa 1-cyfrowego paddingu (Character-Roll_0..7), reszta 2-cyfrowego.
    //  • char02 (Hex) ma plik nazwany "Character-HammerHit_NN.png" zamiast
    //    "Character-Hit_NN.png" — anomalia w CraftPix datasecie. Pliki w
    //    public/ nie do modyfikacji (sandbox), więc obsługujemy w kodzie.
    //
    // Klucz tekstury trzymamy zawsze 2-cyfrowy dla spójności (Player.js też
    // używa pad2 budując frames).
    const fileFramePad = (anim, i) => (anim === 'roll' ? String(i) : pad2(i));
    const animFilePrefix = (charKey, anim) => {
      // char02/hit -> "HammerHit" (CraftPix kwiat). Reszta -> Capitalize(anim).
      if (charKey === 'char02' && anim === 'hit') return 'HammerHit';
      return capitalize(anim);
    };

    for (const charKey of CHARACTER_KEYS) {
      const charPath = ASSET_PATHS.characters[charKey];
      for (const [anim, count] of Object.entries(ANIM_FRAME_COUNTS)) {
        for (let i = 0; i < count; i++) {
          const textureKey = `${charKey}_${anim}_${pad2(i)}`;
          const url = `${charPath}/${anim}/Character-${animFilePrefix(charKey, anim)}_${fileFramePad(anim, i)}.png`;
          this.load.image(textureKey, url);
        }
      }
    }

    // Tła paralaksy.
    this.load.image('bg_layer_00', `${ASSET_PATHS.tileset.background}/layer_00.png`);
    this.load.image('bg_layer_01', `${ASSET_PATHS.tileset.background}/layer_01.png`);

    // Ground tile'y — 13 podstawowych + 7 dodatkowych. Nazwy snake_case
    // ze skopiowanego folderu (sesja 2). Klucze tekstur: ground_01..13,
    // ground_add_01..07.
    const pad = (n) => String(n).padStart(2, '0');
    for (let i = 1; i <= 13; i++) {
      this.load.image(`ground_${pad(i)}`, `${ASSET_PATHS.tileset.ground}/ground_${pad(i)}.png`);
    }
    for (let i = 1; i <= 7; i++) {
      this.load.image(`ground_add_${pad(i)}`, `${ASSET_PATHS.tileset.ground}/ground_additional_${pad(i)}.png`);
    }

    // Przeszkody naziemne — 4 typy.
    for (const o of ['spikes', 'stone', 'wooden_barrel', 'wooden_box']) {
      this.load.image(o, `${ASSET_PATHS.tileset.obstacles}/${o}.png`);
    }

    // Latająca dynia — z dekoracji, używana jako 'flying_pumpkin' obstacle.
    // Klucz textury 'flying_pumpkin' żeby zgadzał się z OBSTACLE_TYPES.
    this.load.image('flying_pumpkin', `${ASSET_PATHS.tileset.decoration}/pumpkin.png`);
    // 'pumpkin' (ten sam plik) jako dekoracja w LevelCompleteScene.
    this.load.image('pumpkin', `${ASSET_PATHS.tileset.decoration}/pumpkin.png`);

    // === Sesja 4: collectables, audio, level backgrounds ===

    // Coiny — 6 klatek (CraftPix omija coin_04). Diamond — pojedynczy obrazek.
    // Animacja 'coin_spin' tworzona w Coin.js (raz, lazy).
    for (const k of ['coin_00', 'coin_01', 'coin_02', 'coin_03', 'coin_05', 'coin_06']) {
      this.load.image(k, `${ASSET_PATHS.tileset.collectables}/${k}.png`);
    }
    this.load.image('diamond', `${ASSET_PATHS.tileset.collectables}/diamond.png`);
    // 'life' używane przez HUD lives w GameScene.
    this.load.image('life', `${ASSET_PATHS.tileset.collectables}/life.png`);

    // SFX (krótkie samples) — preload przez Phaser dla niskiego latency.
    // Muzyka menu (music_menu.mp3) NIE jest tutaj — ładowana streamowo
    // przez HTMLAudioElement w AudioManager.playMusic, żeby preload nie
    // blokował się na dekodowaniu 3.5 MB MP3.
    this.load.audio('jump', 'assets/audio/jump.wav');
    this.load.audio('landing', 'assets/audio/landing.wav');
    this.load.audio('coin', 'assets/audio/coin.wav');
    this.load.audio('crash', 'assets/audio/crash.wav');
    this.load.audio('click', 'assets/audio/click.wav');
    this.load.audio('gameover', 'assets/audio/gameover.m4a');

    // Backgrounds dla 4 leveli — każda warstwa pod kluczem 'bg_levelN_layerM'.
    for (const lvl of LEVELS) {
      for (let i = 1; i <= lvl.bgLayerCount; i++) {
        this.load.image(`bg_${lvl.bgFolder}_layer${i}`, `assets/backgrounds/${lvl.bgFolder}/${i}.png`);
      }
    }
  }

  create() {
    this.scene.start('MenuScene');
  }

  drawProgressBar() {
    const { width, height } = this.scale;
    const barWidth = 400;
    const barHeight = 20;
    const x = (width - barWidth) / 2;
    const y = (height - barHeight) / 2;

    const barBg = this.add.graphics();
    barBg.fillStyle(0x2a1a3e, 1);
    barBg.fillRoundedRect(x, y, barWidth, barHeight, 6);

    const barFill = this.add.graphics();

    const label = this.add.text(width / 2, y - 30, 'Wczytywanie…', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#bdaee3',
    }).setOrigin(0.5);

    const percent = this.add.text(width / 2, y + barHeight + 20, '0%', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#7a6a9a',
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      barFill.clear();
      barFill.fillStyle(0x9b6dff, 1);
      barFill.fillRoundedRect(x, y, barWidth * value, barHeight, 6);
      percent.setText(`${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
      barBg.destroy();
      barFill.destroy();
      label.destroy();
      percent.destroy();
    });
  }
}
