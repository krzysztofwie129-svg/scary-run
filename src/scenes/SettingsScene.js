// SettingsScene — ustawienia gry (zębatka z menu).
// Redesign 2026-06-14 (sesja "idealne UX/UI"): ekran przestał być płaskim
// panelem admina, a stał się częścią gry — atmosferyczne tło (gradient +
// poświata księżyca + winieta + delikatne iskry), karty z głębią (cień +
// poświata akcentu + pasek koloru sekcji), rysowane ikony sekcji, segmentowy
// przełącznik trudności z kolorem per poziom, dopracowane przyciski i kontrast
// tekstu spełniający WCAG. Sekcje: trudność / reset postępu / kopia postępu.

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { getDifficulty, setDifficulty, DIFFICULTY_LABELS } from '../utils/Difficulty.js';
import { resetGame } from '../utils/ResetGame.js';
import { generateAndSaveCode, restoreFromCode, getCurrentCode } from '../utils/ClaimCode.js';
import { reportError } from '../utils/SentryInit.js';

const ADD = Phaser.BlendModes.ADD;

// === Design tokens ===
const C = {
  bgTop: 0x1a0b2e,
  bgMid: 0x150826,
  bgBot: 0x0d0518,
  moon: 0x3a1a5c,
  cardTop: 0x281450,
  cardBot: 0x180a2e,
  cardStroke: 0x3d2a5e,
  track: 0x140a24,
  gold: 0xffd93c,
  goldDark: 0xf0b800,
  pink: 0xff6b9d,
  violet: 0xb084ff,
  cyan: 0x4ecdc4,
  cyanDark: 0x3aa89f,
  danger: 0xff5b5b,
  dangerDark: 0xd63a3a,
};
const T = {
  white: '#f0eaff',
  muted: '#b8a8d8',   // ~5.6:1 na karcie — WCAG AA (było #8678a8 ≈ 3.3:1, fail)
  faint: '#a99cc9',   // ~4.6:1 — najmniejszy tekst pomocniczy
  gold: '#ffd93c',
  ink: '#241043',
  danger: '#ff8f8f',
  violetTxt: '#d4c2ff',
};

// Kolor "thumba" segmentu per poziom trudności (czytelna semantyka koloru).
const DIFF_COLORS = {
  easy: [C.cyan, C.cyanDark],
  normal: [C.gold, C.goldDark],
  hard: [C.danger, C.dangerDark],
};

// Layout — kanwa 1280×720.
const PAD = 44;
const COL_GAP = 26;
const COL_W = (GAME_WIDTH - PAD * 2 - COL_GAP) / 2; // 583
const LEFT_X = PAD;
const RIGHT_X = PAD + COL_W + COL_GAP;
const LEFT_CX = LEFT_X + COL_W / 2;
const RIGHT_CX = RIGHT_X + COL_W / 2;

const DIFF_DESC = {
  easy:   'Wolniej, mniej przeszkód · punkty −30%',
  normal: 'Klasyczne tempo · punkty bez zmian',
  hard:   'Szybciej z każdym poziomem · punkty +5%',
};

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SettingsScene' });
  }

  create() {
    this._domEls = [];
    this._domPositioners = [];

    this._drawBackground();
    this._spawnEmbers(12);
    this._buildHeader();
    this._buildDifficultyCard();
    this._buildResetCard();
    this._buildCodeCard();

    // Wejście — miękki fade z koloru tła (subtelny game-feel, bez refaktoru
    // każdej karty na container).
    this.cameras.main.fadeIn(280, 13, 5, 24);

    this.events.once('shutdown', () => this._cleanupDom());
    this.events.once('destroy', () => this._cleanupDom());
  }

  // === Tło atmosferyczne ===

  _drawBackground() {
    // Bazowy gradient pionowy.
    const g = this.add.graphics();
    g.fillGradientStyle(C.bgTop, C.bgTop, C.bgBot, C.bgBot, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Poświata "księżyca" za nagłówkiem (miękki blask z góry).
    const moon = this.add.graphics().setBlendMode(ADD);
    [{ r: 520, a: 0.10 }, { r: 360, a: 0.10 }, { r: 220, a: 0.10 }].forEach(({ r, a }) => {
      moon.fillStyle(C.moon, a);
      moon.fillCircle(GAME_WIDTH / 2, -40, r);
    });

    // Winieta — przyciemnia rogi, trzyma uwagę na kartach.
    const vig = this.add.graphics();
    [{ s: 0, a: 0.0 }, { s: 1, a: 0.0 }].forEach(() => {});
    vig.fillStyle(0x000000, 0.28);
    // 4 narożne łaty (taniej niż prawdziwa radialna winieta, czytelnie wygląda).
    const cs = 260;
    [[0, 0], [GAME_WIDTH - cs, 0], [0, GAME_HEIGHT - cs], [GAME_WIDTH - cs, GAME_HEIGHT - cs]]
      .forEach(([cx, cy]) => {
        vig.fillStyle(0x000000, 0.22);
        vig.fillRect(cx, cy, cs, cs);
      });
  }

  /** Delikatne iskry unoszące się ku górze. Tworzone PRZED kartami, więc
   *  renderują się za nimi (ta sama głębokość → kolejność wstawiania). */
  _spawnEmbers(n) {
    if (!this.textures.exists('sr_ember')) {
      const eg = this.make.graphics({ x: 0, y: 0, add: false });
      eg.fillStyle(0xffffff, 1);
      eg.fillCircle(8, 8, 6);
      eg.generateTexture('sr_ember', 16, 16);
      eg.destroy();
    }
    for (let i = 0; i < n; i++) {
      const e = this.add.image(0, 0, 'sr_ember')
        .setBlendMode(ADD)
        .setTint(Math.random() < 0.5 ? C.gold : C.pink)
        .setAlpha(0)
        .setScale(Phaser.Math.FloatBetween(0.22, 0.55));
      this.time.delayedCall(Phaser.Math.Between(0, 6000), () => this._runEmber(e));
    }
  }

  _runEmber(e) {
    if (!e.active) return;
    e.x = Phaser.Math.Between(40, GAME_WIDTH - 40);
    e.y = GAME_HEIGHT + 12;
    const dur = Phaser.Math.Between(6000, 9000);
    const peak = Phaser.Math.FloatBetween(0.28, 0.5);
    const x0 = e.x;
    this.tweens.add({
      targets: e,
      y: -20,
      duration: dur,
      ease: 'Linear',
      onUpdate: (tw) => {
        const p = tw.progress;
        e.alpha = Math.sin(p * Math.PI) * peak;
        e.x = x0 + Math.sin(p * 18) * 7;
      },
      onComplete: () => this._runEmber(e),
    });
  }

  // === Header ===

  _buildHeader() {
    // Przycisk powrotu — przez wspólny helper _button (sprawdzony mechanizm
    // wejścia: hit-target = Rectangle origin 0.5, niezawodny dla dotyku).
    this._button(76, 50, 56, 56, '‹', {
      fill: C.cardTop, stroke: C.cardStroke, textColor: T.gold,
      fontSize: 36, radius: 16,
      onClick: () => this.scene.start('MenuScene'),
    });

    // Poświata pod tytułem (miękka — kilka warstw, niski alpha).
    const tg = this.add.graphics().setBlendMode(ADD);
    [{ w: 420, h: 88, a: 0.045 }, { w: 320, h: 64, a: 0.05 }, { w: 210, h: 44, a: 0.05 }]
      .forEach(({ w, h, a }) => {
        tg.fillStyle(C.gold, a);
        tg.fillEllipse(GAME_WIDTH / 2, 52, w, h);
      });

    this.add.text(GAME_WIDTH / 2, 50, 'USTAWIENIA', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '34px', color: T.gold,
      stroke: '#ff6b9d', strokeThickness: 5,
    }).setOrigin(0.5);
  }

  // === Karta: poziom trudności ===

  _buildDifficultyCard() {
    const y = 92;
    const h = 236;
    this._card(LEFT_X, y, COL_W, h, C.gold);
    this._sectionHeader(LEFT_X + 30, y + 40, 'flame', 'POZIOM TRUDNOŚCI', C.gold);

    const current = getDifficulty();
    this._diffDesc = this.add.text(LEFT_CX, y + 182, DIFF_DESC[current], {
      fontFamily: 'Arial, sans-serif', fontSize: '17px', color: T.white,
      fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5);

    this._buildSegmented(
      LEFT_CX, y + 114, COL_W - 60, 60,
      [
        { key: 'easy', label: DIFFICULTY_LABELS.easy },
        { key: 'normal', label: DIFFICULTY_LABELS.normal },
        { key: 'hard', label: DIFFICULTY_LABELS.hard },
      ],
      current,
      (key) => {
        setDifficulty(key);
        // Crossfade opisu.
        this.tweens.add({
          targets: this._diffDesc, alpha: 0, duration: 110,
          onComplete: () => {
            this._diffDesc.setText(DIFF_DESC[key]).setAlpha(0);
            this.tweens.add({ targets: this._diffDesc, alpha: 1, duration: 150 });
          },
        });
        this._showToast('Poziom: ' + DIFFICULTY_LABELS[key], 'ok');
      },
    );
  }

  // === Karta: reset postępu (akcja destrukcyjna — celowo stonowana) ===

  _buildResetCard() {
    const y = 352;
    const h = 236;
    this._card(LEFT_X, y, COL_W, h, C.danger);
    this._sectionHeader(LEFT_X + 30, y + 40, 'warn', 'RESET POSTĘPU', C.danger);

    this.add.text(LEFT_CX, y + 96,
      'Wyzeruje monety, diamenty i odblokowane poziomy.\nTej akcji nie cofniesz.',
      {
        fontFamily: 'Arial, sans-serif', fontSize: '16px', color: T.white,
        fontStyle: 'bold', align: 'center', lineSpacing: 7,
      }).setOrigin(0.5);

    // Button outline danger — nie wypełniony, żeby nie był najmocniejszym
    // akcentem ekranu (to akcja, której zwykle NIE chcemy).
    this._button(LEFT_CX, y + 160, 268, 50, 'Zacznij od nowa', {
      fill: C.danger, fillAlpha: 0.10, stroke: C.danger, textColor: T.danger,
      fontSize: 18, radius: 13,
      onClick: () => this._showResetConfirm(),
    });

    this.add.text(LEFT_CX, y + 204,
      'Wynik w rankingu zostanie pod starym imieniem.',
      { fontFamily: 'Arial, sans-serif', fontSize: '13px', color: T.muted, fontStyle: 'bold' })
      .setOrigin(0.5);
  }

  // === Karta: kopia postępu (claim code) ===

  _buildCodeCard() {
    const y = 92;
    const h = 496;
    this._card(RIGHT_X, y, COL_W, h, C.violet);
    this._sectionHeader(RIGHT_X + 30, y + 40, 'sync', 'KOPIA POSTĘPU', C.violet);

    this.add.text(RIGHT_CX, y + 82,
      'Zapisz postęp jako kod i wczytaj go\nna innym urządzeniu.',
      {
        fontFamily: 'Arial, sans-serif', fontSize: '16px', color: T.white,
        fontStyle: 'bold', align: 'center', lineSpacing: 6,
      }).setOrigin(0.5);

    // Twój kod
    this.add.text(RIGHT_CX, y + 128, 'TWÓJ KOD', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '15px', color: T.muted,
      letterSpacing: 2,
    }).setOrigin(0.5);

    const code = getCurrentCode();
    const codeBox = this.add.graphics();
    this._codeBoxY = y + 146;
    this._redrawCodeBox(codeBox, !!code);
    this._codeText = this.add.text(RIGHT_CX, y + 170, code || '— jeszcze nie masz kodu —', {
      fontFamily: code ? 'Courier, monospace' : 'Arial, sans-serif',
      fontSize: code ? '24px' : '16px',
      color: code ? T.gold : T.muted,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this._codeBox = codeBox;

    // Generuj + Kopiuj
    this._button(RIGHT_CX - 122, y + 236, 252, 48,
      code ? 'Nowy kod' : 'Wygeneruj kod', {
        grad: [C.violet, 0x8a5cf0], glow: C.violet, shadow: true, textColor: T.ink,
        fontSize: 17, radius: 13,
        onClick: () => this._handleGenerate(),
      });
    this._button(RIGHT_CX + 134, y + 236, 196, 48, 'Kopiuj', {
      fill: C.violet, fillAlpha: 0.12, stroke: C.violet, textColor: T.violetTxt,
      fontSize: 17, radius: 13,
      onClick: () => this._handleCopy(),
    });

    // Divider z etykietą-chipem
    const divY = y + 292;
    const dg = this.add.graphics();
    dg.lineStyle(1.5, C.cardStroke, 1);
    dg.lineBetween(RIGHT_X + 38, divY, RIGHT_CX - 92, divY);
    dg.lineBetween(RIGHT_CX + 92, divY, RIGHT_X + COL_W - 38, divY);
    this.add.text(RIGHT_CX, divY, 'MASZ JUŻ KOD?', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '15px', color: T.muted,
      letterSpacing: 1,
    }).setOrigin(0.5);

    // DOM input — kod do przywrócenia
    this._buildCodeInput(y + 344);

    // Przywróć
    this._button(RIGHT_CX, y + 422, 300, 54, 'Przywróć postęp', {
      grad: [C.gold, C.goldDark], glow: C.gold, shadow: true, textColor: T.ink,
      fontSize: 19, radius: 15,
      onClick: () => this._handleRestore(),
    });
  }

  _redrawCodeBox(g, hasCode) {
    g.clear();
    g.fillStyle(C.track, 1);
    g.fillRoundedRect(RIGHT_CX - 230, this._codeBoxY, 460, 48, 12);
    g.lineStyle(2, hasCode ? C.gold : C.cardStroke, 1);
    g.strokeRoundedRect(RIGHT_CX - 230, this._codeBoxY, 460, 48, 12);
  }

  _buildCodeInput(yLogical) {
    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.placeholder = 'SCARY-XXXX-XXXX';
    inputEl.maxLength = 15;
    inputEl.autocomplete = 'off';
    inputEl.autocapitalize = 'characters';
    inputEl.setAttribute('autocorrect', 'off');
    inputEl.spellcheck = false;
    inputEl.style.cssText = `
      position: absolute; left: 0; top: 0;
      transform: translate(-50%, -50%);
      box-sizing: border-box;
      font-family: Courier, monospace; font-weight: bold;
      text-align: center;
      background: #140a24; color: #ffd93c;
      border: 2px solid #b084ff; border-radius: 12px;
      text-transform: uppercase; letter-spacing: 2px;
      outline: none;
      z-index: 1000;
    `;
    inputEl.addEventListener('input', () => {
      inputEl.value = inputEl.value.toUpperCase();
    });
    document.body.appendChild(inputEl);
    this._domEls.push(inputEl);
    this._codeInputEl = inputEl;

    const positionInput = () => {
      try {
        const canvas = this.game?.canvas;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const sx = rect.width / GAME_WIDTH;
        const sy = rect.height / GAME_HEIGHT;
        inputEl.style.left = (rect.left + RIGHT_CX * sx) + 'px';
        inputEl.style.top = (rect.top + yLogical * sy) + 'px';
        inputEl.style.width = (320 * sx) + 'px';
        inputEl.style.height = (52 * sy) + 'px';
        // min 16px → iOS nie zoomuje przy focusie inputa.
        inputEl.style.fontSize = Math.max(16, Math.floor(20 * sy)) + 'px';
      } catch { /* ignore */ }
    };
    positionInput();
    window.addEventListener('resize', positionInput);
    window.addEventListener('orientationchange', positionInput);
    this._domPositioners.push({ fn: positionInput });
  }

  // === Handlery sekcji kodu ===

  async _handleGenerate() {
    try {
      const newCode = await generateAndSaveCode();
      this._codeText.setText(newCode).setStyle({
        fontFamily: 'Courier, monospace', fontSize: '23px',
        color: T.gold, fontStyle: 'bold',
      });
      this._redrawCodeBox(this._codeBox, true);
      // Złoty błysk pudełka kodu (sygnał sukcesu bez dźwięku).
      const flash = this.add.graphics().setBlendMode(ADD);
      flash.fillStyle(C.gold, 0.5);
      flash.fillRoundedRect(RIGHT_CX - 230, this._codeBoxY, 460, 48, 12);
      this.tweens.add({
        targets: flash, alpha: 0, duration: 420,
        onComplete: () => flash.destroy(),
      });
      this._showToast('Kod gotowy', 'ok');
    } catch (e) {
      reportError(e, { context: 'generateCode' });
      this._showToast('Nie udało się wygenerować kodu', 'err');
    }
  }

  async _handleCopy() {
    const c = getCurrentCode();
    if (!c) { this._showToast('Najpierw wygeneruj kod', 'err'); return; }
    try {
      await navigator.clipboard.writeText(c);
      this._showToast('Skopiowano', 'ok');
    } catch {
      this._showToast(c, 'ok');
    }
  }

  async _handleRestore() {
    const c = this._codeInputEl?.value;
    if (!c || !c.trim()) { this._showToast('Wpisz kod', 'err'); return; }
    try {
      const ok = await restoreFromCode(c);
      if (ok) {
        this._showToast('Postęp odzyskany — wracam do menu', 'ok');
        this.time.delayedCall(1500, () => {
          this._cleanupDom();
          this.scene.start('MenuScene');
        });
      } else {
        this._showToast('Nie znaleziono takiego kodu', 'err');
      }
    } catch (e) {
      this._showToast(e?.message || 'Nie udało się przywrócić postępu', 'err');
      reportError(e, { context: 'restoreCode' });
    }
  }

  // === Modal: potwierdzenie resetu ===

  _showResetConfirm() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const boxW = 580;
    const boxH = 348;

    const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.82)
      .setDepth(10000).setInteractive();

    const glow = this.add.graphics().setDepth(10000).setBlendMode(ADD);
    glow.fillStyle(C.danger, 0.10);
    glow.fillRoundedRect(cx - boxW / 2 - 10, cy - boxH / 2 - 10, boxW + 20, boxH + 20, 28);

    const box = this.add.graphics().setDepth(10001);
    box.fillGradientStyle(C.cardTop, C.cardTop, C.cardBot, C.cardBot, 1);
    box.fillRoundedRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 24);
    box.lineStyle(2, C.danger, 1);
    box.strokeRoundedRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 24);

    const t1 = this.add.text(cx, cy - 118, 'Zresetować postęp?', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '28px', color: T.gold,
      stroke: '#ff6b9d', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10002);

    const t2 = this.add.text(cx, cy - 60,
      'Stracisz monety, diamenty i odblokowane poziomy.\nWpisz nowe imię albo zostaw stare.',
      {
        fontFamily: 'Arial, sans-serif', fontSize: '15px', color: T.muted,
        align: 'center', lineSpacing: 6,
      }).setOrigin(0.5).setDepth(10002);

    const nameEl = document.createElement('input');
    nameEl.type = 'text';
    nameEl.placeholder = 'Twoje imię';
    nameEl.maxLength = 12;
    nameEl.autocapitalize = 'characters';
    nameEl.style.cssText = `
      position: fixed; left: 50%; top: 51%;
      transform: translate(-50%, -50%);
      box-sizing: border-box;
      width: 260px; height: 50px;
      font-family: 'Arial Black', sans-serif;
      font-size: 22px; text-align: center;
      background: #140a24; color: #ffd93c;
      border: 2px solid #ff6b9d; border-radius: 12px;
      text-transform: uppercase; letter-spacing: 2px;
      outline: none;
      z-index: 10003;
    `;
    nameEl.addEventListener('input', () => {
      nameEl.value = nameEl.value.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
    });
    document.body.appendChild(nameEl);
    this._domEls.push(nameEl);

    const yes = this._button(cx - 130, cy + 108, 232, 54, 'Tak, resetuj', {
      fill: C.danger, stroke: C.danger, textColor: '#ffffff',
      fontSize: 18, radius: 14, depth: 10002,
      onClick: () => {
        const newName = nameEl.value.trim().slice(0, 12);
        resetGame();
        if (newName) {
          try { localStorage.setItem('scaryrun_pending_name', newName); } catch { /* ignore */ }
        }
        cleanup();
        this._showToast('Postęp zresetowany', 'ok');
        this.time.delayedCall(1200, () => {
          this._cleanupDom();
          this.scene.start('MenuScene');
        });
      },
    });

    const no = this._button(cx + 130, cy + 108, 232, 54, 'Anuluj', {
      fill: null, stroke: C.cardStroke, textColor: '#ffffff',
      fontSize: 18, radius: 14, depth: 10002,
      onClick: () => cleanup(),
    });

    const cleanup = () => {
      try { nameEl.remove(); } catch { /* ignore */ }
      this._domEls = this._domEls.filter((e) => e !== nameEl);
      [overlay, glow, box, t1, t2, yes, no].forEach((o) => {
        try { o.destroy(); } catch { /* ignore */ }
      });
    };
  }

  // === Komponenty UI ===

  /** Karta z głębią: poświata akcentu (ADD) + cień + gradient + ramka +
   *  górny highlight + lewy pasek koloru sekcji. */
  _card(x, y, w, h, accent) {
    const glow = this.add.graphics().setBlendMode(ADD);
    [{ o: 20, a: 0.030 }, { o: 12, a: 0.045 }, { o: 6, a: 0.060 }].forEach(({ o, a }) => {
      glow.fillStyle(accent, a);
      glow.fillRoundedRect(x - o, y - o, w + o * 2, h + o * 2, 20 + o);
    });

    const sh = this.add.graphics();
    sh.fillStyle(0x000000, 0.38);
    sh.fillRoundedRect(x + 3, y + 9, w - 6, h, 20);

    const g = this.add.graphics();
    g.fillGradientStyle(C.cardTop, C.cardTop, C.cardBot, C.cardBot, 1);
    g.fillRoundedRect(x, y, w, h, 20);
    g.lineStyle(1.5, C.cardStroke, 0.9);
    g.strokeRoundedRect(x, y, w, h, 20);

    // Górny highlight (lit lip).
    const hl = this.add.graphics();
    hl.lineStyle(1.5, 0xffffff, 0.07);
    hl.lineBetween(x + 22, y + 1.5, x + w - 22, y + 1.5);

    // Lewy pasek akcentu sekcji.
    const bar = this.add.graphics();
    bar.fillStyle(accent, 0.9);
    bar.fillRoundedRect(x, y + 20, 4, h - 40, 2);
  }

  /** Nagłówek sekcji: chip z ikoną (rysowaną) + tytuł. */
  _sectionHeader(x, y, iconType, text, accent) {
    // Chip pod ikoną.
    const chip = this.add.graphics();
    chip.fillStyle(accent, 0.14);
    chip.fillRoundedRect(x - 2, y - 17, 34, 34, 10);

    const ic = this.add.graphics().setDepth(1);
    const cx = x + 15, cy = y;
    if (iconType === 'flame') this._iconFlame(ic, cx, cy, 12, accent, C.pink);
    else if (iconType === 'warn') this._iconWarn(ic, cx, cy, 12, accent);
    else if (iconType === 'sync') this._iconSync(ic, cx, cy, 11, accent);

    this.add.text(x + 46, y, text, {
      fontFamily: 'Arial Black, sans-serif', fontSize: '21px', color: T.white,
      letterSpacing: 1,
    }).setOrigin(0, 0.5);
  }

  // --- Rysowane ikony sekcji ---

  _iconFlame(g, cx, cy, s, outer, inner) {
    g.fillStyle(outer, 1);
    g.fillCircle(cx, cy + s * 0.25, s * 0.62);
    g.fillTriangle(cx - s * 0.6, cy + s * 0.3, cx + s * 0.6, cy + s * 0.3, cx, cy - s * 0.95);
    g.fillStyle(inner, 1);
    g.fillCircle(cx, cy + s * 0.32, s * 0.32);
    g.fillTriangle(cx - s * 0.3, cy + s * 0.32, cx + s * 0.3, cy + s * 0.32, cx, cy - s * 0.32);
  }

  _iconWarn(g, cx, cy, s, color) {
    g.fillStyle(color, 0.18);
    g.fillTriangle(cx, cy - s, cx - s * 0.95, cy + s * 0.78, cx + s * 0.95, cy + s * 0.78);
    g.lineStyle(2.4, color, 1);
    g.strokeTriangle(cx, cy - s, cx - s * 0.95, cy + s * 0.78, cx + s * 0.95, cy + s * 0.78);
    g.fillStyle(color, 1);
    g.fillRoundedRect(cx - 1.5, cy - s * 0.28, 3, s * 0.62, 1.5);
    g.fillCircle(cx, cy + s * 0.58, 2);
  }

  _iconSync(g, cx, cy, s, color) {
    g.lineStyle(2.4, color, 1);
    g.beginPath();
    g.arc(cx, cy, s, Phaser.Math.DegToRad(55), Phaser.Math.DegToRad(320), false);
    g.strokePath();
    // Grot strzałki na końcu łuku (~320°) — sugeruje obrót/odzysk.
    const a = Phaser.Math.DegToRad(320);
    const ex = cx + Math.cos(a) * s;
    const ey = cy + Math.sin(a) * s;
    g.fillStyle(color, 1);
    g.fillTriangle(ex - 5, ey - 4, ex + 5, ey - 1, ex - 2, ey + 6);
  }

  /** Zaokrąglony przycisk jako Container (graphics + tekst + hit area).
   *  Opcje: fill/fillAlpha, grad [top,bot], stroke, glow (kolor poświaty ADD),
   *  shadow. Hit-target = Rectangle origin 0.5 (sprawdzony, stabilny input). */
  _button(cx, cy, w, h, label, opts = {}) {
    const {
      fill = null, fillAlpha = 1, grad = null, stroke = null, glow = null,
      shadow = false, textColor = '#ffffff',
      fontSize = 19, radius = 14, depth = 0, onClick = () => {},
    } = opts;
    const c = this.add.container(cx, cy).setDepth(depth);
    const kids = [];

    let glowG = null;
    if (glow !== null) {
      glowG = this.add.graphics().setBlendMode(ADD);
      glowG.fillStyle(glow, 0.26);
      glowG.fillRoundedRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10, radius + 4);
      kids.push(glowG);
    }
    if (shadow) {
      const sh = this.add.graphics();
      sh.fillStyle(0x000000, 0.38);
      sh.fillRoundedRect(-w / 2, -h / 2 + 5, w, h, radius);
      kids.push(sh);
    }
    const g = this.add.graphics();
    if (grad !== null) {
      g.fillGradientStyle(grad[0], grad[0], grad[1], grad[1], 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    } else if (fill !== null) {
      g.fillStyle(fill, fillAlpha);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    }
    if (stroke !== null) {
      g.lineStyle(2.5, stroke, 1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    }
    kids.push(g);

    const txt = this.add.text(0, 0, label, {
      fontFamily: 'Arial Black, sans-serif', fontSize: fontSize + 'px',
      color: textColor,
    }).setOrigin(0.5);
    kids.push(txt);

    const hit = this.add.rectangle(0, 0, w, h, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    kids.push(hit);
    c.add(kids);

    hit.on('pointerover', () => {
      this.tweens.add({ targets: c, scale: 1.04, duration: 90 });
      if (glowG) glowG.setAlpha(0.42);
    });
    hit.on('pointerout', () => {
      this.tweens.add({ targets: c, scale: 1, duration: 90 });
      txt.setScale(1);
      if (glowG) glowG.setAlpha(1);
    });
    hit.on('pointerdown', () => txt.setScale(0.92));
    hit.on('pointerup', () => { txt.setScale(1); onClick(); });
    return c;
  }

  /** Segmentowy przełącznik — track + ruchomy thumb (kolor per poziom) +
   *  poświata + płynny przesuw + etykiety. */
  _buildSegmented(cx, cy, w, h, options, activeKey, onSelect) {
    const n = options.length;
    const inset = 4;
    const segW = (w - inset * 2) / n;
    const thumbW = segW;
    const thumbH = h - inset * 2;

    const track = this.add.graphics();
    track.fillStyle(C.track, 0.85);
    track.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    track.lineStyle(1.5, C.cardStroke, 1);
    track.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);

    const thumb = this.add.container(0, cy);
    const tglow = this.add.graphics().setBlendMode(ADD);
    const tg = this.add.graphics();
    thumb.add([tglow, tg]);

    const drawThumb = (key) => {
      const [c1, c2] = DIFF_COLORS[key] || [C.gold, C.goldDark];
      tg.clear();
      tg.fillStyle(c1, 1);
      tg.fillRoundedRect(-thumbW / 2, -thumbH / 2, thumbW, thumbH, thumbH / 2);
      tg.fillStyle(c2, 0.55);
      tg.fillRoundedRect(-thumbW / 2, thumbH * 0.06, thumbW, thumbH * 0.44, thumbH / 2);
      tglow.clear();
      tglow.fillStyle(c1, 0.32);
      tglow.fillRoundedRect(-thumbW / 2 - 6, -thumbH / 2 - 6, thumbW + 12, thumbH + 12, (thumbH + 12) / 2);
    };

    const labels = [];
    const xOf = (i) => cx - w / 2 + inset + segW * (i + 0.5);
    const idxOf = (key) => Math.max(0, options.findIndex((o) => o.key === key));

    const select = (i, fire) => {
      drawThumb(options[i].key);
      this.tweens.add({ targets: thumb, x: xOf(i), duration: 160, ease: 'Cubic.easeOut' });
      labels.forEach((l, j) => l.setColor(j === i ? T.ink : T.muted));
      if (fire) {
        this.tweens.add({ targets: labels[i], scale: 1.12, duration: 110, yoyo: true });
        onSelect(options[i].key);
      }
    };

    options.forEach((opt, i) => {
      const segCx = xOf(i);
      const lbl = this.add.text(segCx, cy, opt.label, {
        fontFamily: 'Arial Black, sans-serif', fontSize: '20px', color: T.muted,
      }).setOrigin(0.5).setDepth(1);
      labels.push(lbl);

      const zone = this.add.zone(segCx, cy, segW, h).setInteractive({ useHandCursor: true }).setDepth(2);
      // pointerdown (nawet pusty) stabilizuje wykrywanie tapu.
      zone.on('pointerdown', () => {});
      zone.on('pointerup', () => select(i, true));
    });

    const init = idxOf(activeKey);
    drawThumb(options[init].key);
    thumb.x = xOf(init);
    labels.forEach((l, j) => l.setColor(j === init ? T.ink : T.muted));
  }

  // === Toast ===

  _showToast(message, kind = 'ok') {
    if (this._toast) {
      try { this._toast.destroy(); } catch { /* ignore */ }
    }
    const accent = kind === 'err' ? C.danger : C.cyan;
    const c = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 38).setDepth(99999);
    const txt = this.add.text(18, 0, message, {
      fontFamily: 'Arial Black, sans-serif', fontSize: '17px', color: '#ffffff',
    }).setOrigin(0, 0.5);
    const w = txt.width + 72;
    const h = 46;
    const g = this.add.graphics();
    g.fillStyle(0x140a24, 0.96);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.lineStyle(1.5, accent, 0.95);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    txt.setX(-w / 2 + 46);
    // Ikonka statusu.
    const ic = this.add.graphics();
    const ix = -w / 2 + 26, iy = 0;
    ic.lineStyle(3, accent, 1);
    if (kind === 'err') {
      ic.lineBetween(ix - 5, iy - 5, ix + 5, iy + 5);
      ic.lineBetween(ix + 5, iy - 5, ix - 5, iy + 5);
    } else {
      ic.beginPath();
      ic.moveTo(ix - 6, iy);
      ic.lineTo(ix - 1, iy + 5);
      ic.lineTo(ix + 7, iy - 6);
      ic.strokePath();
    }
    c.add([g, ic, txt]);
    this._toast = c;
    c.setScale(0.9).setAlpha(0).setY(c.y + 16);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, y: GAME_HEIGHT - 38, duration: 200, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: c, alpha: 0, y: c.y - 16, duration: 360, delay: 1600,
      onComplete: () => { try { c.destroy(); } catch { /* ignore */ } if (this._toast === c) this._toast = null; },
    });
  }

  // === Sprzątanie DOM ===

  _cleanupDom() {
    for (const el of this._domEls) {
      try { el.remove(); } catch { /* ignore */ }
    }
    this._domEls = [];
    for (const p of (this._domPositioners || [])) {
      try { window.removeEventListener('resize', p.fn); } catch { /* ignore */ }
      try { window.removeEventListener('orientationchange', p.fn); } catch { /* ignore */ }
    }
    this._domPositioners = [];
  }
}
