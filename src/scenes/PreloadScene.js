// PreloadScene — ładuje assety używane w MenuScene + GameScene MVP:
//   • postacie char01-03: animacje idle/run/jump/hit/fall (image sequence)
//   • tła: layer_00, layer_01
// Ground/obstacles/collectables doładujemy w sesji 3.
//
// Klucze tekstur pod jakimi assety lądują w cache:
//   <charKey>_<anim>_<NN>  np. char01_idle_00, char02_run_29, char03_hit_39
//   bg_layer_00, bg_layer_01

import { ASSET_PATHS, CHARACTER_KEYS, ANIM_FRAME_COUNTS, LEVELS } from '../config.js';
import { orientationGuard } from '../utils/OrientationGuard.js';
import { canPlay } from '../utils/DeviceDetect.js';

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

    // Muzyka menu wyłączona (sesja 7.1) — nie pre-fetchujemy.

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
          const url = `${charPath}/${anim}/Character-${animFilePrefix(charKey, anim)}_${fileFramePad(anim, i)}.webp`;
          this.load.image(textureKey, url);
        }
      }
    }

    // Tła paralaksy.
    this.load.image('bg_layer_00', `${ASSET_PATHS.tileset.background}/layer_00.webp`);
    this.load.image('bg_layer_01', `${ASSET_PATHS.tileset.background}/layer_01.webp`);

    // ChestSelect assets — bg + 3 sprite'y (postument, skrzynia zamkn./otwarta)
    // + spritesheet z cyframi 1/2/3 (900×300 → 3 klatki 300×300).
    this.load.image('chest_select_bg', 'assets/ui/chest_select_bg.webp');
    this.load.image('chest_pedestal', 'assets/ui/chest_pedestal.webp');
    this.load.image('chest_closed', 'assets/ui/chest_closed.webp');
    this.load.image('chest_open', 'assets/ui/chest_open.webp');
    this.load.spritesheet('chest_numbers', 'assets/ui/chest_numbers.webp', {
      frameWidth: 300,
      frameHeight: 300,
    });
    this.load.image('reward_frame', 'assets/ui/reward_frame.webp');
    this.load.image('continue_button', 'assets/ui/continue_button.webp');

    // MenuScene assets — nowy layout w stylu Subway Surfers (sesja 8.x).
    // Wszystkie lossless WebP żeby uniknąć pixelizy na anti-alias.
    this.load.image('menu_bg', 'assets/ui/menu_bg.webp');
    // menu_logo ładowane w BootScene (używane też na progress barze).
    this.load.image('menu_demon', 'assets/ui/menu_demon.webp');
    this.load.image('menu_btn_kontynuuj', 'assets/ui/menu_btn_kontynuuj.webp');
    this.load.image('menu_btn_graj', 'assets/ui/menu_btn_graj.webp');
    this.load.image('menu_btn_multi', 'assets/ui/menu_btn_multi.webp');
    this.load.image('menu_btn_ranking', 'assets/ui/menu_btn_ranking.webp');
    this.load.image('menu_icons_row', 'assets/ui/menu_icons_row.webp');
    this.load.image('menu_stat_bars', 'assets/ui/menu_stat_bars.webp');
    this.load.image('menu_tap_text', 'assets/ui/menu_tap_text.webp');

    // OrientationLockScene assets — portrait mode "OBRÓĆ TELEFON".
    this.load.image('orientation_bg', 'assets/ui/orientation_bg.webp');
    this.load.image('orientation_frame', 'assets/ui/orientation_frame.webp');
    this.load.image('orientation_phone', 'assets/ui/orientation_phone.webp');
    this.load.image('orientation_title', 'assets/ui/orientation_title.webp');
    this.load.image('orientation_subtitle', 'assets/ui/orientation_subtitle.webp');

    // LeaderboardScene assets — TOP 10 layout (sesja 8.x).
    this.load.image('leaderboard_bg', 'assets/ui/leaderboard_bg.webp');
    this.load.image('leaderboard_title', 'assets/ui/leaderboard_title.webp');
    this.load.image('leaderboard_table', 'assets/ui/leaderboard_table.webp');
    this.load.image('leaderboard_back', 'assets/ui/leaderboard_back.webp');

    // NameInputScene assets — WPISZ IMIĘ layout (sesja 8.x).
    this.load.image('nameinput_bg', 'assets/ui/nameinput_bg.webp');
    this.load.image('nameinput_title', 'assets/ui/nameinput_title.webp');
    this.load.image('nameinput_frame', 'assets/ui/nameinput_frame.webp');
    this.load.image('nameinput_confirm', 'assets/ui/nameinput_confirm.webp');

    // CharSelectScene assets — character cards (sesja 8.x).
    this.load.image('charselect_bg', 'assets/ui/charselect_bg.webp');
    this.load.image('charselect_title', 'assets/ui/charselect_title.webp');
    this.load.image('charselect_subtitle', 'assets/ui/charselect_subtitle.webp');
    this.load.image('charselect_back', 'assets/ui/charselect_back.webp');
    this.load.image('charselect_card_char01', 'assets/ui/charselect_card_char01.webp');
    this.load.image('charselect_card_char02', 'assets/ui/charselect_card_char02.webp');
    this.load.image('charselect_card_char03', 'assets/ui/charselect_card_char03.webp');

    // LevelCompleteScene assets — sesja 8.x.
    this.load.image('levelcomplete_bg', 'assets/ui/levelcomplete_bg.webp');
    this.load.image('levelcomplete_confetti', 'assets/ui/levelcomplete_confetti.webp');
    this.load.image('levelcomplete_title', 'assets/ui/levelcomplete_title.webp');
    this.load.image('levelcomplete_stars', 'assets/ui/levelcomplete_stars.webp');
    this.load.image('levelcomplete_stat_frame', 'assets/ui/levelcomplete_stat_frame.webp');
    this.load.image('levelcomplete_stat_icons', 'assets/ui/levelcomplete_stat_icons.webp');
    this.load.image('levelcomplete_progress_frame', 'assets/ui/levelcomplete_progress_frame.webp');
    this.load.image('levelcomplete_progress_fill', 'assets/ui/levelcomplete_progress_fill.webp');
    this.load.image('levelcomplete_rank', 'assets/ui/levelcomplete_rank.webp');
    this.load.image('levelcomplete_next', 'assets/ui/levelcomplete_next.webp');

    // PauseScene assets — sesja 8.x.
    this.load.image('pause_title', 'assets/ui/pause_title.webp');
    this.load.image('pause_btn_resume', 'assets/ui/pause_btn_resume.webp');
    this.load.image('pause_btn_menu', 'assets/ui/pause_btn_menu.webp');

    // GameOverScene assets — sesja 8.x.
    this.load.image('gameover_title', 'assets/ui/gameover_title.webp');
    this.load.image('gameover_btn_restart', 'assets/ui/gameover_btn_restart.webp');
    this.load.image('gameover_btn_menu', 'assets/ui/gameover_btn_menu.webp');
    this.load.image('gameover_label_score', 'assets/ui/gameover_label_score.webp');
    this.load.image('gameover_label_level', 'assets/ui/gameover_label_level.webp');
    this.load.image('gameover_highscore', 'assets/ui/gameover_highscore.webp');

    // Sesja 7.4.3: ŻADNYCH ground tile'ów nie ładujemy. Player biega po
    // niewidzialnych collider'ach (alpha 0 rectangles w Ground.js); visible
    // ground = parallax warstwy levelu (CraftPix halloween_bg ma trawę
    // wbudowaną w bottom layer). -20 HTTP requestów w preload.

    // Przeszkody naziemne — 4 typy.
    for (const o of ['spikes', 'stone', 'wooden_barrel', 'wooden_box']) {
      this.load.image(o, `${ASSET_PATHS.tileset.obstacles}/${o}.webp`);
    }

    // Latająca dynia — z dekoracji, używana jako 'flying_pumpkin' obstacle.
    // Klucz textury 'flying_pumpkin' żeby zgadzał się z OBSTACLE_TYPES.
    this.load.image('flying_pumpkin', `${ASSET_PATHS.tileset.decoration}/pumpkin.webp`);
    // 'pumpkin' (ten sam plik) jako dekoracja w LevelCompleteScene.
    this.load.image('pumpkin', `${ASSET_PATHS.tileset.decoration}/pumpkin.webp`);

    // === Sesja 4: collectables, audio, level backgrounds ===

    // Coiny — 6 klatek (CraftPix omija coin_04). Diamond — pojedynczy obrazek.
    // Animacja 'coin_spin' tworzona w Coin.js (raz, lazy).
    for (const k of ['coin_00', 'coin_01', 'coin_02', 'coin_03', 'coin_05', 'coin_06']) {
      this.load.image(k, `${ASSET_PATHS.tileset.collectables}/${k}.webp`);
    }
    this.load.image('diamond', `${ASSET_PATHS.tileset.collectables}/diamond.webp`);
    // 'life' używane przez HUD lives w GameScene.
    this.load.image('life', `${ASSET_PATHS.tileset.collectables}/life.webp`);

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

    // Sesja Audio SFX v1: chest, boss, power-up.
    this.load.audio('chest_open', 'assets/audio/chest_open.mp3');
    this.load.audio('chest_reveal', 'assets/audio/chest_reveal.mp3');
    this.load.audio('boss_attack', 'assets/audio/boss_attack.mp3');
    this.load.audio('boss_player_hit', 'assets/audio/boss_player_hit.mp3');
    this.load.audio('powerup_pickup', 'assets/audio/powerup_pickup.mp3');
    this.load.audio('boss_victory', 'assets/audio/boss_victory.mp3');

    // BossFightScene control buttons — JUMP (lewa) + ATTACK (prawa).
    this.load.image('boss_btn_jump', 'assets/ui/boss_btn_jump.webp');
    this.load.image('boss_btn_attack', 'assets/ui/boss_btn_attack.webp');
    // Boss BGs — 1 per level (1-10). Cycle gdy level > 10.
    for (let i = 1; i <= 10; i++) {
      const key = `boss_bg_${String(i).padStart(2, '0')}`;
      this.load.image(key, `assets/ui/${key}.webp`);
    }

    // Backgrounds dla 4 leveli — każda warstwa pod kluczem 'bg_levelN_layerM'.
    for (const lvl of LEVELS) {
      for (let i = 1; i <= lvl.bgLayerCount; i++) {
        this.load.image(`bg_${lvl.bgFolder}_layer${i}`, `assets/backgrounds/${lvl.bgFolder}/${i}.webp`);
      }
    }
  }

  create() {
    // Aktywuj OrientationGuard — assety załadowane. Jeśli canPlay=false
    // (portrait / desktop), guard.start() wywoła scene.start('OrientationLockScene')
    // i zatrzyma PreloadScene.
    orientationGuard.start();

    // Jeśli canPlay=true, guard nic nie zrobił — ręcznie przechodzimy do
    // MenuScene. UWAGA: nie używamy `this.scene.isActive('PreloadScene')` jako
    // gating — w trakcie własnego create() Phaser scene state to CREATING
    // (nie RUNNING) i isActive może zwracać false. Bezpośredni canPlay() check
    // jest jednoznaczny.
    if (canPlay()) {
      this.scene.start('MenuScene');
    }
  }

  drawProgressBar() {
    const { width, height } = this.scale;

    // Tło — pełnoekranowa Halloween Night grafika.
    if (this.textures.exists('loading_bg')) {
      this.add.image(width / 2, height / 2, 'loading_bg').setDisplaySize(width, height);
    }

    // Logo gry — nad progress barem.
    if (this.textures.exists('menu_logo')) {
      this.add.image(width / 2, height / 2 - 130, 'menu_logo').setDisplaySize(540, 180);
    }

    // Tekst "Wczytywanie..." usunięty — sama ramka + procent wystarczą.
    let label = null;

    // Bar frame (gold ramka z skull-bat dekoracją na górze).
    const barCenterX = width / 2;
    const barCenterY = height / 2 + 20;
    const barW = 720;
    const barH = 80;

    if (this.textures.exists('loading_bar_frame')) {
      this.add.image(barCenterX, barCenterY, 'loading_bar_frame').setDisplaySize(barW, barH);
    }

    // Bar fill — sprite z origin (0, 0.5), scaleX 0→1 simulates rośnie od lewej.
    // fillW wyraźnie mniejsze od barW żeby zostawić margines na złotą ramkę
    // — bez tego fill przy 100% wycieka poza krawędź ramki.
    const fillW = barW - 130; // 720 - 130 = 590 wewnętrzna szerokość
    const fillH = barH - 38;  // 80 - 38 = 42 wewnętrzna wysokość
    let fill = null;
    let baseFillScaleX = 1;
    if (this.textures.exists('loading_bar_fill')) {
      fill = this.add.image(barCenterX - fillW / 2, barCenterY, 'loading_bar_fill')
        .setOrigin(0, 0.5)
        .setDisplaySize(fillW, fillH);
      // NORMAL blend (zamiast ADD) — czystsze krawędzie, brak halo na anti-alias.
      // Tło checkerboard z fuzz floodfill częściowo jeszcze przeszkadza —
      // lossless WebP daje krzystszy bar.
      // Bug fix: zapamiętaj scaleX PO setDisplaySize (= fillW / texture.width),
      // PRZED zerowaniem. Bez tego progress=1 dawało scaleX=1 → sprite native
      // size = 760px, dłuższy niż 590 fillW → wylazi poza ramkę.
      baseFillScaleX = fill.scaleX;
      fill.scaleX = 0; // start empty
    } else {
      fill = this.add.rectangle(barCenterX - fillW / 2, barCenterY, fillW, fillH, 0x9b6dff)
        .setOrigin(0, 0.5);
      baseFillScaleX = 1;
      fill.scaleX = 0;
    }

    const percentText = this.add.text(width / 2, barCenterY + barH / 2 + 20, '0%', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '16px',
      color: '#bdaee3',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      // Skaluj fill X od 0 do baseFillScaleX*value (sprite pełen = baseFillScaleX).
      fill.scaleX = baseFillScaleX * value;
      percentText.setText(`${Math.round(value * 100)}%`);
    });

    // Brak destroy w complete — Phaser czyści na scene shutdown.
    // Bar fill na 100% widoczny aż do transition do MenuScene.
  }
}
