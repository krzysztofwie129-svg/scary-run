// SettingsScene — ustawienia gry (zębatka z menu).
// Redesign 2026-05: layout dwukolumnowy, karty z zaokrąglonymi rogami,
// segmentowany przełącznik trudności, akcja destrukcyjna (reset) wyraźnie
// zdjęta z pierwszego planu. Sekcje: trudność / reset postępu / kopia postępu.

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { getDifficulty, setDifficulty, DIFFICULTY_LABELS } from '../utils/Difficulty.js';
import { resetGame } from '../utils/ResetGame.js';
import { generateAndSaveCode, restoreFromCode, getCurrentCode } from '../utils/ClaimCode.js';
import { reportError } from '../utils/SentryInit.js';

// === Design tokens ===
const C = {
  bg: 0x150826,
  bgTop: 0x241043,
  card: 0x241640,
  cardStroke: 0x4a3570,
  track: 0x140a24,
  gold: 0xffd93c,
  pink: 0xff6b9d,
  violet: 0xb084ff,
  cyan: 0x4ecdc4,
  danger: 0xff5b5b,
};
const T = {
  white: '#ffffff',
  muted: '#bdaee3',
  faint: '#8678a8',
  gold: '#ffd93c',
  ink: '#1a0a2e',
  danger: '#ff8f8f',
};

// Layout — kanwa 1280×720.
const PAD = 44;
const COL_GAP = 28;
const COL_W = (GAME_WIDTH - PAD * 2 - COL_GAP) / 2; // 582
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
    this._buildHeader();
    this._buildDifficultyCard();
    this._buildResetCard();
    this._buildCodeCard();

    this.events.once('shutdown', () => this._cleanupDom());
    this.events.once('destroy', () => this._cleanupDom());
  }

  // === Tło ===

  _drawBackground() {
    const g = this.add.graphics();
    g.fillGradientStyle(C.bgTop, C.bgTop, C.bg, C.bg, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  // === Header ===

  _buildHeader() {
    // Przycisk powrotu — przez wspólny helper _button (ten sam, sprawdzony
    // mechanizm wejścia co reszta przycisków; wcześniejszy własny Container
    // miał niestabilny input — raz łapał tap, raz nie).
    this._button(80, 48, 58, 58, '‹', {
      fill: C.card, stroke: C.cardStroke, textColor: T.gold,
      fontSize: 36, radius: 16,
      onClick: () => this.scene.start('MenuScene'),
    });

    this.add.text(GAME_WIDTH / 2, 48, 'USTAWIENIA', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '34px', color: T.gold,
      stroke: '#ff6b9d', strokeThickness: 5,
    }).setOrigin(0.5);
  }

  // === Karta: poziom trudności ===

  _buildDifficultyCard() {
    const y = 88;
    const h = 232;
    this._panel(LEFT_X, y, COL_W, h);
    this._sectionLabel(LEFT_X + 32, y + 38, 'POZIOM TRUDNOŚCI', C.gold);

    const current = getDifficulty();
    this._diffDesc = this.add.text(LEFT_CX, y + 174, DIFF_DESC[current], {
      fontFamily: 'Arial, sans-serif', fontSize: '15px', color: T.muted,
      align: 'center',
    }).setOrigin(0.5);

    this._buildSegmented(
      LEFT_CX, y + 110, COL_W - 64, 60,
      [
        { key: 'easy', label: DIFFICULTY_LABELS.easy },
        { key: 'normal', label: DIFFICULTY_LABELS.normal },
        { key: 'hard', label: DIFFICULTY_LABELS.hard },
      ],
      current,
      (key) => {
        setDifficulty(key);
        this._diffDesc.setText(DIFF_DESC[key]);
        this._showToast('Poziom: ' + DIFFICULTY_LABELS[key]);
      },
    );
  }

  // === Karta: reset postępu (akcja destrukcyjna — celowo stonowana) ===

  _buildResetCard() {
    const y = 340;
    const h = 232;
    this._panel(LEFT_X, y, COL_W, h);
    this._sectionLabel(LEFT_X + 32, y + 38, 'RESET POSTĘPU', C.danger);

    this.add.text(LEFT_CX, y + 92,
      'Wyzeruje monety, diamenty i odblokowane poziomy.\nTej akcji nie cofniesz.',
      {
        fontFamily: 'Arial, sans-serif', fontSize: '15px', color: T.muted,
        align: 'center', lineSpacing: 6,
      }).setOrigin(0.5);

    // Button outline danger — nie wypełniony, żeby nie był najmocniejszym
    // akcentem ekranu (to akcja, której zwykle NIE chcemy).
    this._button(LEFT_CX, y + 158, 268, 50, 'Zacznij od nowa', {
      fill: null, stroke: C.danger, textColor: T.danger,
      fontSize: 18, radius: 13,
      onClick: () => this._showResetConfirm(),
    });

    this.add.text(LEFT_CX, y + 200,
      'Wynik w rankingu zostanie pod starym imieniem.',
      { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: T.faint })
      .setOrigin(0.5);
  }

  // === Karta: kopia postępu (claim code) ===

  _buildCodeCard() {
    const y = 88;
    const h = 484;
    this._panel(RIGHT_X, y, COL_W, h);
    this._sectionLabel(RIGHT_X + 32, y + 38, 'KOPIA POSTĘPU', C.violet);

    this.add.text(RIGHT_CX, y + 76,
      'Zapisz postęp jako kod i wczytaj go\nna innym urządzeniu.',
      {
        fontFamily: 'Arial, sans-serif', fontSize: '15px', color: T.muted,
        align: 'center', lineSpacing: 5,
      }).setOrigin(0.5);

    // Twój kod
    this.add.text(RIGHT_CX, y + 124, 'TWÓJ KOD', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '13px', color: T.faint,
    }).setOrigin(0.5);

    const code = getCurrentCode();
    const codeBox = this.add.graphics();
    codeBox.fillStyle(C.track, 1);
    codeBox.fillRoundedRect(RIGHT_CX - 230, y + 142, 460, 48, 12);
    codeBox.lineStyle(2, code ? C.gold : C.cardStroke, 1);
    codeBox.strokeRoundedRect(RIGHT_CX - 230, y + 142, 460, 48, 12);
    this._codeText = this.add.text(RIGHT_CX, y + 166, code || '— jeszcze nie masz kodu —', {
      fontFamily: code ? 'Courier, monospace' : 'Arial, sans-serif',
      fontSize: code ? '23px' : '15px',
      color: code ? T.gold : T.faint,
      fontStyle: code ? 'bold' : 'normal',
    }).setOrigin(0.5);
    this._codeBox = codeBox;
    this._codeBoxY = y + 142;

    // Generuj + Kopiuj
    this._button(RIGHT_CX - 122, y + 232, 252, 48,
      code ? 'Nowy kod' : 'Wygeneruj kod', {
        fill: C.violet, stroke: C.violet, textColor: T.ink,
        fontSize: 17, radius: 13,
        onClick: () => this._handleGenerate(),
      });
    this._button(RIGHT_CX + 134, y + 232, 196, 48, 'Kopiuj', {
      fill: null, stroke: C.violet, textColor: '#d9c2ff',
      fontSize: 17, radius: 13,
      onClick: () => this._handleCopy(),
    });

    // Divider
    const divY = y + 286;
    const dg = this.add.graphics();
    dg.lineStyle(1.5, C.cardStroke, 1);
    dg.lineBetween(RIGHT_X + 40, divY, RIGHT_CX - 158, divY);
    dg.lineBetween(RIGHT_CX + 158, divY, RIGHT_X + COL_W - 40, divY);
    this.add.text(RIGHT_CX, divY, 'MASZ JUŻ KOD?', {
      fontFamily: 'Arial Black, sans-serif', fontSize: '13px', color: T.faint,
    }).setOrigin(0.5);

    // DOM input — kod do przywrócenia
    this._buildCodeInput(y + 336);

    // Przywróć
    this._button(RIGHT_CX, y + 410, 300, 54, 'Przywróć postęp', {
      fill: C.gold, stroke: C.gold, textColor: T.ink,
      fontSize: 19, radius: 15,
      onClick: () => this._handleRestore(),
    });
  }

  _buildCodeInput(yLogical) {
    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.placeholder = 'SCARY-XXXX-XXXX';
    inputEl.maxLength = 15;
    inputEl.autocomplete = 'off';
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
        inputEl.style.fontSize = Math.max(14, Math.floor(20 * sy)) + 'px';
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
      this._codeBox.clear();
      this._codeBox.fillStyle(C.track, 1);
      this._codeBox.fillRoundedRect(RIGHT_CX - 230, this._codeBoxY, 460, 48, 12);
      this._codeBox.lineStyle(2, C.gold, 1);
      this._codeBox.strokeRoundedRect(RIGHT_CX - 230, this._codeBoxY, 460, 48, 12);
      this._showToast('Kod gotowy');
    } catch (e) {
      reportError(e, { context: 'generateCode' });
      this._showToast('Nie udało się wygenerować kodu');
    }
  }

  async _handleCopy() {
    const c = getCurrentCode();
    if (!c) { this._showToast('Najpierw wygeneruj kod'); return; }
    try {
      await navigator.clipboard.writeText(c);
      this._showToast('Skopiowano');
    } catch {
      this._showToast(c);
    }
  }

  async _handleRestore() {
    const c = this._codeInputEl?.value;
    if (!c || !c.trim()) { this._showToast('Wpisz kod'); return; }
    try {
      const ok = await restoreFromCode(c);
      if (ok) {
        this._showToast('Postęp odzyskany — wracam do menu');
        this.time.delayedCall(1500, () => {
          this._cleanupDom();
          this.scene.start('MenuScene');
        });
      } else {
        this._showToast('Nie znaleziono takiego kodu');
      }
    } catch (e) {
      this._showToast(e?.message || 'Nie udało się przywrócić postępu');
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

    const box = this.add.graphics().setDepth(10001);
    box.fillStyle(C.card, 1);
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
        this._showToast('Postęp zresetowany');
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
      [overlay, box, t1, t2, yes, no].forEach((o) => {
        try { o.destroy(); } catch { /* ignore */ }
      });
    };
  }

  // === Komponenty UI ===

  _panel(x, y, w, h) {
    const g = this.add.graphics();
    g.fillStyle(C.card, 1);
    g.fillRoundedRect(x, y, w, h, 22);
    g.lineStyle(1.5, C.cardStroke, 1);
    g.strokeRoundedRect(x, y, w, h, 22);
    return g;
  }

  _sectionLabel(x, y, text, accentColor) {
    const g = this.add.graphics();
    g.fillStyle(accentColor, 1);
    g.fillRoundedRect(x, y - 11, 6, 22, 3);
    this.add.text(x + 18, y, text, {
      fontFamily: 'Arial Black, sans-serif', fontSize: '21px', color: T.white,
    }).setOrigin(0, 0.5);
  }

  /** Zaokrąglony przycisk jako Container (graphics + tekst + hit area). */
  _button(cx, cy, w, h, label, opts = {}) {
    const {
      fill = null, stroke = null, textColor = '#ffffff',
      fontSize = 19, radius = 14, depth = 0, onClick = () => {},
    } = opts;
    const c = this.add.container(cx, cy).setDepth(depth);
    const g = this.add.graphics();
    if (fill !== null) {
      g.fillStyle(fill, 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, radius);
    }
    if (stroke !== null) {
      g.lineStyle(2.5, stroke, 1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, radius);
    }
    const txt = this.add.text(0, 0, label, {
      fontFamily: 'Arial Black, sans-serif', fontSize: fontSize + 'px',
      color: textColor,
    }).setOrigin(0.5);
    // Hit target = prawdziwy Rectangle (origin 0.5), dziecko kontenera.
    // Container.setInteractive({hitArea}) miał przesuniętą strefę klikalną —
    // łapał tylko górny-lewy róg przycisku. Rectangle ma natywny, poprawnie
    // wyśrodkowany input — niezawodny dla myszy i dotyku.
    const hit = this.add.rectangle(0, 0, w, h, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    c.add([g, txt, hit]);
    hit.on('pointerover', () => this.tweens.add({ targets: c, scale: 1.04, duration: 90 }));
    hit.on('pointerout', () => { this.tweens.add({ targets: c, scale: 1, duration: 90 }); txt.setScale(1); });
    hit.on('pointerdown', () => txt.setScale(0.92));
    hit.on('pointerup', () => { txt.setScale(1); onClick(); });
    return c;
  }

  /** Segmentowany przełącznik (track + ruchomy „thumb" + etykiety). */
  _buildSegmented(cx, cy, w, h, options, activeKey, onSelect) {
    const n = options.length;
    const inset = 5;
    const segW = (w - inset * 2) / n;

    const track = this.add.graphics();
    track.fillStyle(C.track, 1);
    track.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
    track.lineStyle(1.5, C.cardStroke, 1);
    track.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);

    const thumb = this.add.graphics();
    const labels = [];

    const idxOf = (key) => Math.max(0, options.findIndex((o) => o.key === key));

    const render = (activeIdx) => {
      thumb.clear();
      const x = cx - w / 2 + inset + activeIdx * segW;
      thumb.fillStyle(C.gold, 1);
      thumb.fillRoundedRect(x, cy - h / 2 + inset, segW, h - inset * 2, (h - inset * 2) / 2);
      labels.forEach((lbl, i) => {
        const on = i === activeIdx;
        lbl.setColor(on ? T.ink : T.muted);
      });
    };

    options.forEach((opt, i) => {
      const segCx = cx - w / 2 + inset + segW * (i + 0.5);
      const lbl = this.add.text(segCx, cy, opt.label, {
        fontFamily: 'Arial Black, sans-serif', fontSize: '19px', color: T.muted,
      }).setOrigin(0.5);
      labels.push(lbl);

      const zone = this.add.zone(segCx, cy, segW, h).setInteractive({ useHandCursor: true });
      // pointerdown (nawet pusty) stabilizuje wykrywanie tapu — patrz _buildHeader.
      zone.on('pointerdown', () => {});
      zone.on('pointerup', () => {
        render(i);
        this.tweens.add({ targets: lbl, scale: 1.12, duration: 110, yoyo: true });
        onSelect(opt.key);
      });
    });

    render(idxOf(activeKey));
  }

  // === Toast ===

  _showToast(message) {
    if (this._toast) {
      try { this._toast.destroy(); } catch { /* ignore */ }
    }
    const c = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 40).setDepth(99999);
    const txt = this.add.text(0, 0, message, {
      fontFamily: 'Arial Black, sans-serif', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5);
    const w = txt.width + 48;
    const h = 46;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.88);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.lineStyle(1.5, C.gold, 0.9);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    c.add([g, txt]);
    this._toast = c;
    c.setScale(0.85).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 180, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: c, alpha: 0, y: c.y - 16, duration: 400, delay: 1500,
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
