// SettingsScene — opcje gry (zębatka z menu).
// Zawiera: difficulty selector (easy/normal/hard) + reset gry + claim code.

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { getDifficulty, setDifficulty, DIFFICULTY_LABELS } from '../utils/Difficulty.js';
import { resetGame } from '../utils/ResetGame.js';
import { generateAndSaveCode, restoreFromCode, getCurrentCode } from '../utils/ClaimCode.js';
import { reportError } from '../utils/SentryInit.js';

const PURPLE = 0x2d1b4e;
const GOLD = 0xffd93c;
const PINK = 0xff6b9d;
const VIOLET = 0x6b4ea0;

export class SettingsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SettingsScene' });
  }

  create() {
    this._domEls = [];
    this.cameras.main.setBackgroundColor('#1a0a2e');

    // === Header ===
    this.add.text(GAME_WIDTH / 2, 50, 'USTAWIENIA', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '36px',
      color: '#ffd93c',
      stroke: '#ff6b9d', strokeThickness: 5,
    }).setOrigin(0.5);

    // Back button
    const backBg = this.add.rectangle(80, 50, 130, 50, VIOLET, 0.95)
      .setStrokeStyle(3, GOLD).setInteractive({ useHandCursor: true });
    this.add.text(80, 50, '← WRÓĆ', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '18px', color: '#ffffff',
      stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5);
    backBg.on('pointerup', () => this.scene.start('MenuScene'));

    // === SEKCJA 1: Difficulty ===
    this.add.text(GAME_WIDTH / 2, 110, 'POZIOM TRUDNOŚCI', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '22px', color: '#bdaee3',
    }).setOrigin(0.5);

    const current = getDifficulty();
    const diffOpts = [
      { mode: 'easy', label: DIFFICULTY_LABELS.easy, x: GAME_WIDTH / 2 - 200 },
      { mode: 'normal', label: DIFFICULTY_LABELS.normal, x: GAME_WIDTH / 2 },
      { mode: 'hard', label: DIFFICULTY_LABELS.hard, x: GAME_WIDTH / 2 + 200 },
    ];
    this._diffBtns = {};
    for (const opt of diffOpts) {
      const isActive = opt.mode === current;
      const bg = this.add.rectangle(opt.x, 165, 170, 55, isActive ? GOLD : VIOLET, 0.95)
        .setStrokeStyle(3, isActive ? PINK : GOLD)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(opt.x, 165, opt.label, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '20px',
        color: isActive ? '#1a0a2e' : '#ffffff',
        stroke: '#000', strokeThickness: 2,
      }).setOrigin(0.5);
      bg.on('pointerup', () => {
        setDifficulty(opt.mode);
        this._refreshDifficultyButtons(opt.mode);
        this._showToast('Zapisano: ' + opt.label);
      });
      this._diffBtns[opt.mode] = { bg, txt };
    }
    this.add.text(GAME_WIDTH / 2, 210,
      'Łatwy: -30% trudności i punktów  •  Trudny: +5% per level',
      { fontFamily: 'Arial, sans-serif', fontSize: '14px', color: '#8678a8' },
    ).setOrigin(0.5);

    // === SEKCJA 2: Claim code ===
    this.add.text(GAME_WIDTH / 2, 270, 'KOD RATUNKOWY', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '22px', color: '#bdaee3',
    }).setOrigin(0.5);

    const code = getCurrentCode();
    const codeBox = this.add.rectangle(GAME_WIDTH / 2, 320, 460, 50, PURPLE, 1)
      .setStrokeStyle(3, GOLD);
    this._codeText = this.add.text(GAME_WIDTH / 2, 320, code || '— wygeneruj nowy —', {
      fontFamily: 'Courier, monospace',
      fontSize: code ? '24px' : '16px',
      color: code ? '#ffd93c' : '#bdaee3',
    }).setOrigin(0.5);

    this._makeBtn(GAME_WIDTH / 2 - 145, 380, 240, 45,
      code ? 'WYGENERUJ NOWY' : 'WYGENERUJ KOD', 0xb084ff,
      async () => {
        try {
          const newCode = await generateAndSaveCode();
          this._codeText.setText(newCode).setStyle({
            fontSize: '24px', color: '#ffd93c',
          });
          this._showToast('Kod wygenerowany');
        } catch (e) {
          reportError(e, { context: 'generateCode' });
          this._showToast('Błąd: ' + (e?.message || 'unknown'));
        }
      });

    this._makeBtn(GAME_WIDTH / 2 + 145, 380, 240, 45, 'SKOPIUJ', 0x4ade80,
      async () => {
        const c = getCurrentCode();
        if (!c) { this._showToast('Najpierw wygeneruj'); return; }
        try {
          await navigator.clipboard.writeText(c);
          this._showToast('Skopiowano!');
        } catch {
          this._showToast(c); // fallback wyświetl
        }
      });

    // Restore via input (DOM element overlay)
    this.add.text(GAME_WIDTH / 2, 440, 'lub odzyskaj postęp z kodu:', {
      fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#8678a8',
    }).setOrigin(0.5);

    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.placeholder = 'SCARY-XXXX-XXXX';
    inputEl.maxLength = 14;
    inputEl.style.cssText = `
      position: fixed; left: 50%; top: 64%;
      transform: translateX(-50%);
      width: 320px; padding: 12px;
      font-family: Courier, monospace;
      font-size: 20px; text-align: center;
      background: #2d1b4e; color: #ffd93c;
      border: 3px solid #ff6b9d; border-radius: 8px;
      text-transform: uppercase; letter-spacing: 2px;
      z-index: 1000;
    `;
    inputEl.addEventListener('input', () => {
      inputEl.value = inputEl.value.toUpperCase();
    });
    document.body.appendChild(inputEl);
    this._domEls.push(inputEl);

    this._makeBtn(GAME_WIDTH / 2, 545, 320, 50, 'PRZYWRÓĆ POSTĘP', GOLD,
      async () => {
        const c = inputEl.value.trim();
        if (!c) { this._showToast('Wpisz kod'); return; }
        try {
          const ok = await restoreFromCode(c);
          if (ok) {
            this._showToast('Odzyskano! Wracam do menu...');
            this.time.delayedCall(1500, () => {
              this._cleanupDom();
              this.scene.start('MenuScene');
            });
          } else {
            this._showToast('Kod nie istnieje');
          }
        } catch (e) {
          this._showToast(e?.message || 'Błąd');
          reportError(e, { context: 'restoreCode' });
        }
      });

    // === SEKCJA 3: Reset gry ===
    this.add.text(GAME_WIDTH / 2, 615, 'RESET POSTĘPU', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '20px', color: '#bdaee3',
    }).setOrigin(0.5);
    this._makeBtn(GAME_WIDTH / 2, 660, 360, 50, 'ZACZNIJ OD POCZĄTKU', 0xd05050,
      () => this._showResetConfirm());
    this.add.text(GAME_WIDTH / 2, 695,
      'Stary wynik w rankingu zostaje pod poprzednim imieniem',
      { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#8678a8' },
    ).setOrigin(0.5);

    // Cleanup DOM input on shutdown
    this.events.once('shutdown', () => this._cleanupDom());
    this.events.once('destroy', () => this._cleanupDom());
  }

  _refreshDifficultyButtons(activeMode) {
    for (const [mode, btn] of Object.entries(this._diffBtns)) {
      const isActive = mode === activeMode;
      btn.bg.setFillStyle(isActive ? GOLD : VIOLET, 0.95);
      btn.bg.setStrokeStyle(3, isActive ? PINK : GOLD);
      btn.txt.setColor(isActive ? '#1a0a2e' : '#ffffff');
    }
  }

  _makeBtn(x, y, w, h, label, fillColor, onClick) {
    const bg = this.add.rectangle(x, y, w, h, fillColor, 0.95)
      .setStrokeStyle(3, GOLD)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '18px',
      color: '#1a0a2e',
      stroke: '#fff', strokeThickness: 1,
    }).setOrigin(0.5);
    bg.on('pointerup', onClick);
    return { bg, txt };
  }

  _showResetConfirm() {
    // Modal: "Czy na pewno?" + nick input + TAK/NIE
    const overlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2,
      GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85).setDepth(10000)
      .setInteractive();
    const box = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 600, 320,
      PURPLE, 1).setStrokeStyle(4, GOLD).setDepth(10001);
    const t1 = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 110,
      'Reset postępu', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '28px', color: '#ffd93c',
        stroke: '#ff6b9d', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(10002);
    const t2 = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 65,
      'Wszystkie monety, diamenty i postępy zostaną wyzerowane.\nWpisz nowe imię (lub zostaw stare):',
      {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px', color: '#bdaee3', align: 'center',
      }).setOrigin(0.5).setDepth(10002);

    const nameEl = document.createElement('input');
    nameEl.type = 'text';
    nameEl.placeholder = 'NICK';
    nameEl.maxLength = 12;
    nameEl.style.cssText = `
      position: fixed; left: 50%; top: 51%;
      transform: translate(-50%, -50%);
      width: 240px; padding: 10px;
      font-family: 'Arial Black', sans-serif;
      font-size: 22px; text-align: center;
      background: #1a0a2e; color: #ffd93c;
      border: 3px solid #ff6b9d; border-radius: 6px;
      text-transform: uppercase; letter-spacing: 2px;
      z-index: 10003;
    `;
    nameEl.addEventListener('input', () => { nameEl.value = nameEl.value.toUpperCase().replace(/[^A-Z0-9 ]/g, ''); });
    document.body.appendChild(nameEl);
    this._domEls.push(nameEl);

    const yesBg = this.add.rectangle(GAME_WIDTH / 2 - 110, GAME_HEIGHT / 2 + 80,
      180, 50, 0xd05050, 1).setStrokeStyle(3, GOLD).setDepth(10002)
      .setInteractive({ useHandCursor: true });
    const yesTxt = this.add.text(GAME_WIDTH / 2 - 110, GAME_HEIGHT / 2 + 80,
      'TAK, ZRESETUJ', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '16px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(10003);

    const noBg = this.add.rectangle(GAME_WIDTH / 2 + 110, GAME_HEIGHT / 2 + 80,
      180, 50, VIOLET, 1).setStrokeStyle(3, GOLD).setDepth(10002)
      .setInteractive({ useHandCursor: true });
    const noTxt = this.add.text(GAME_WIDTH / 2 + 110, GAME_HEIGHT / 2 + 80,
      'NIE', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '16px', color: '#ffffff',
      }).setOrigin(0.5).setDepth(10003);

    const cleanup = () => {
      try { nameEl.remove(); } catch {}
      this._domEls = this._domEls.filter((e) => e !== nameEl);
      [overlay, box, t1, t2, yesBg, yesTxt, noBg, noTxt].forEach((o) => {
        try { o.destroy(); } catch {}
      });
    };

    yesBg.on('pointerup', () => {
      const newName = nameEl.value.trim().slice(0, 12);
      resetGame();
      // Po reset, MenuScene zachowuje się jakby user był nowy.
      // Jeśli wpisał nick, zapiszemy go do session na potem (na char-select scenie
      // standardowy flow zapyta o imię, więc przekazujemy startem).
      if (newName) {
        try { localStorage.setItem('scaryrun_pending_name', newName); } catch {}
      }
      cleanup();
      this._showToast('Zresetowano postęp');
      this.time.delayedCall(1200, () => {
        this._cleanupDom();
        this.scene.start('MenuScene');
      });
    });
    noBg.on('pointerup', cleanup);
  }

  _cleanupDom() {
    for (const el of this._domEls) {
      try { el.remove(); } catch {}
    }
    this._domEls = [];
  }

  _showToast(message) {
    const toast = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 25, message, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '20px', color: '#ffffff',
      stroke: '#000', strokeThickness: 4,
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: { x: 18, y: 8 },
    }).setOrigin(0.5).setDepth(99999);
    this.tweens.add({
      targets: toast, alpha: 0, duration: 1500, delay: 1200,
      onComplete: () => { try { toast.destroy(); } catch {} },
    });
  }
}
