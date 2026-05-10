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
    this._domPositioners = [];
    this.cameras.main.setBackgroundColor('#1a0a2e');

    // === Header (Y=35) ===
    this.add.text(GAME_WIDTH / 2, 35, 'USTAWIENIA', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '32px', color: '#ffd93c',
      stroke: '#ff6b9d', strokeThickness: 5,
    }).setOrigin(0.5);

    // Back button — shop_btn_back asset (spójny z resztą).
    if (this.textures.exists('shop_btn_back')) {
      const back = this.add.image(110, 50, 'shop_btn_back')
        .setDisplaySize(180, 60)
        .setDepth(99999)
        .setInteractive({ useHandCursor: true });
      back.on('pointerover', () => back.setScale(back.scaleX * 1.05, back.scaleY * 1.05));
      back.on('pointerout', () => back.setScale(back.scaleX / 1.05, back.scaleY / 1.05));
      back.on('pointerup', () => this.scene.start('MenuScene'));
    } else {
      const backBg = this.add.rectangle(80, 50, 130, 50, VIOLET, 0.95)
        .setStrokeStyle(3, GOLD).setInteractive({ useHandCursor: true });
      this.add.text(80, 50, '← WRÓĆ', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '18px', color: '#ffffff',
        stroke: '#000', strokeThickness: 3,
      }).setOrigin(0.5);
      backBg.on('pointerup', () => this.scene.start('MenuScene'));
    }

    // === SEKCJA 1: Difficulty (Y=75-160) ===
    this.add.text(GAME_WIDTH / 2, 75, 'POZIOM TRUDNOŚCI', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '20px', color: '#bdaee3',
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
      const bg = this.add.rectangle(opt.x, 120, 170, 50, isActive ? GOLD : VIOLET, 0.95)
        .setStrokeStyle(3, isActive ? PINK : GOLD)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(opt.x, 120, opt.label, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '18px',
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
    this.add.text(GAME_WIDTH / 2, 160,
      'Łatwy: -30% trudności i punktów  •  Trudny: +5% per level',
      { fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#8678a8' },
    ).setOrigin(0.5);

    // === SEKCJA 2: Reset postępu (Y=200-310) — jasne fioletowe tło, duży button ===
    this.add.text(GAME_WIDTH / 2, 200, 'RESET POSTĘPU', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '22px', color: '#ffd93c',
      stroke: '#ff6b9d', strokeThickness: 3,
    }).setOrigin(0.5);
    this.add.rectangle(GAME_WIDTH / 2, 255, 700, 80, 0xb084ff, 0.25)
      .setStrokeStyle(2, 0xb084ff);
    const _resetBtnBg = this.add.rectangle(GAME_WIDTH / 2, 255, 480, 60, 0xff6b9d, 1)
      .setStrokeStyle(4, 0xffd93c).setInteractive({ useHandCursor: true });
    this.add.text(GAME_WIDTH / 2, 255, 'ZACZNIJ OD POCZĄTKU', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '24px', color: '#ffffff',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5);
    _resetBtnBg.on('pointerup', () => this._showResetConfirm());
    _resetBtnBg.on('pointerover', () => _resetBtnBg.setScale(1.03));
    _resetBtnBg.on('pointerout', () => _resetBtnBg.setScale(1.0));
    this.add.text(GAME_WIDTH / 2, 305,
      'Stary wynik w rankingu zostaje pod poprzednim imieniem',
      { fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#bdaee3' },
    ).setOrigin(0.5);

    // === SEKCJA 3: Claim code (Y=345-700) ===
    this.add.text(GAME_WIDTH / 2, 345, 'KOD RATUNKOWY', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '20px', color: '#bdaee3',
    }).setOrigin(0.5);
    const code = getCurrentCode();
    this.add.rectangle(GAME_WIDTH / 2, 390, 460, 48, PURPLE, 1)
      .setStrokeStyle(3, GOLD);
    this._codeText = this.add.text(GAME_WIDTH / 2, 390, code || '— wygeneruj nowy —', {
      fontFamily: 'Courier, monospace',
      fontSize: code ? '22px' : '15px',
      color: code ? '#ffd93c' : '#bdaee3',
    }).setOrigin(0.5);

    this._makeBtn(GAME_WIDTH / 2 - 145, 445, 240, 42,
      code ? 'WYGENERUJ NOWY' : 'WYGENERUJ KOD', 0xb084ff,
      async () => {
        try {
          const newCode = await generateAndSaveCode();
          this._codeText.setText(newCode).setStyle({
            fontSize: '22px', color: '#ffd93c',
          });
          this._showToast('Kod wygenerowany');
        } catch (e) {
          reportError(e, { context: 'generateCode' });
          this._showToast('Błąd: ' + (e?.message || 'unknown'));
        }
      });
    this._makeBtn(GAME_WIDTH / 2 + 145, 445, 240, 42, 'SKOPIUJ', 0x4ade80,
      async () => {
        const c = getCurrentCode();
        if (!c) { this._showToast('Najpierw wygeneruj'); return; }
        try {
          await navigator.clipboard.writeText(c);
          this._showToast('Skopiowano!');
        } catch { this._showToast(c); }
      });

    this.add.text(GAME_WIDTH / 2, 500, 'lub odzyskaj postęp z kodu:', {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#8678a8',
    }).setOrigin(0.5);

    // DOM input — pozycjonowany w Phaser-coords (Y=545) z auto-resize na zmianę viewportu.
    const inputEl = document.createElement('input');
    inputEl.type = 'text';
    inputEl.placeholder = 'SCARY-XXXX-XXXX';
    inputEl.maxLength = 14;
    inputEl.autocomplete = 'off';
    inputEl.style.cssText = `
      position: absolute; left: 0; top: 0;
      transform: translate(-50%, -50%);
      font-family: Courier, monospace;
      text-align: center;
      background: #2d1b4e; color: #ffd93c;
      border: 3px solid #ff6b9d; border-radius: 6px;
      text-transform: uppercase; letter-spacing: 2px;
      z-index: 1000;
    `;
    inputEl.addEventListener('input', () => {
      // Pozwala paste z spacjami/cudzymi znakami; sanitize wykonuje restoreFromCode.
      inputEl.value = inputEl.value.toUpperCase();
    });
    document.body.appendChild(inputEl);
    this._domEls.push(inputEl);

    // Auto-position DOM input względem canvas (rozwiązuje fixed-percent issue na phone).
    const positionInput = () => {
      try {
        const canvas = this.game?.canvas;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const sx = rect.width / GAME_WIDTH;
        const sy = rect.height / GAME_HEIGHT;
        const px = rect.left + (GAME_WIDTH / 2) * sx;
        const py = rect.top + 545 * sy;
        inputEl.style.left = px + 'px';
        inputEl.style.top = py + 'px';
        inputEl.style.width = (300 * sx) + 'px';
        inputEl.style.padding = (8 * sy) + 'px';
        inputEl.style.fontSize = Math.max(13, Math.floor(18 * sy)) + 'px';
      } catch { /* ignore */ }
    };
    positionInput();
    window.addEventListener('resize', positionInput);
    window.addEventListener('orientationchange', positionInput);
    this._domPositioners.push({ fn: positionInput });

    this._makeBtn(GAME_WIDTH / 2, 620, 320, 50, 'PRZYWRÓĆ POSTĘP', GOLD,
      async () => {
        const c = inputEl.value;
        if (!c || !c.trim()) { this._showToast('Wpisz kod'); return; }
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

    // Drag-scroll camera (safety net dla bardzo małych ekranów < 720h logicznych).
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, Math.max(GAME_HEIGHT, 720));
    let dragStartY = 0, camStart = 0, isDragging = false;
    this.input.on('pointerdown', (p) => {
      // Nie startuj dragu jeśli klik jest na intearctive elemencie (Phaser ogarnia).
      isDragging = true; dragStartY = p.y; camStart = this.cameras.main.scrollY;
    });
    this.input.on('pointermove', (p) => {
      if (!isDragging || !p.isDown) return;
      const dy = p.y - dragStartY;
      this.cameras.main.scrollY = Math.max(0, Math.min(50, camStart - dy));
    });
    this.input.on('pointerup', () => { isDragging = false; });

    // Cleanup
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
    for (const p of (this._domPositioners || [])) {
      try { window.removeEventListener('resize', p.fn); } catch {}
      try { window.removeEventListener('orientationchange', p.fn); } catch {}
    }
    this._domPositioners = [];
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
