// InputHelper — TextInput dla NameInputScene. Phaser nie ma natywnego
// text input GameObject, więc rzeźbimy własny: prostokąt + Text + listener
// na keyboard input scene.
//
// API:
//   const input = new TextInput(scene, x, y, { onEnter: (val) => ..., onChange: (val) => ... });
//   input.value;                 // bieżąca wartość
//   input.setValue('xxx');       // nadpisz
//   input.destroy();             // sprzątanie listenerów

import {
  NAME_MAX_LENGTH,
  NAME_ALLOWED_CHARS_REGEX,
} from '../config.js';
import { isTouchDevice } from './DeviceDetect.js';

export class TextInput {
  constructor(scene, x, y, options = {}) {
    this.scene = scene;
    this.value = options.value || '';
    this.maxLength = options.maxLength ?? NAME_MAX_LENGTH;
    this.allowedRegex = options.allowedRegex ?? NAME_ALLOWED_CHARS_REGEX;
    this.onChange = options.onChange || (() => {});
    this.onEnter = options.onEnter || (() => {});

    const width = options.width ?? 480;
    const height = options.height ?? 70;

    this.bg = scene.add.rectangle(x, y, width, height, 0x000000, 0.6)
      .setStrokeStyle(3, 0xffd93c);

    this.text = scene.add.text(x, y, this.displayValue(), {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '36px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // Mruga cursor (alpha pulsing). Gdy gracz pisze, refresh() resetuje alpha.
    this.cursorBlink = scene.tweens.add({
      targets: this.text,
      alpha: 0.4,
      duration: 500,
      yoyo: true,
      repeat: -1,
    });

    this.keyHandler = (event) => this.handleKey(event);
    scene.input.keyboard.on('keydown', this.keyHandler);

    // Mobile soft keyboard support — Phaser na touch device nie wywołuje
    // natywnej klawiatury. Tworzymy ukryty <input> w DOM, focus na nim
    // pokazuje soft keyboard, a my synchronizujemy value z naszym text.
    if (isTouchDevice()) {
      this.htmlInput = document.createElement('input');
      this.htmlInput.type = 'text';
      this.htmlInput.maxLength = this.maxLength;
      this.htmlInput.autocomplete = 'off';
      this.htmlInput.autocapitalize = 'characters';
      this.htmlInput.style.position = 'fixed';
      this.htmlInput.style.opacity = '0.01';
      this.htmlInput.style.left = '50%';
      this.htmlInput.style.top = '50%';
      this.htmlInput.style.width = '1px';
      this.htmlInput.style.height = '1px';
      // fontSize 16px → iOS nie zoom'uje viewport przy focusie.
      this.htmlInput.style.fontSize = '16px';
      this.htmlInput.style.zIndex = '99999';
      this.htmlInput.style.border = 'none';
      this.htmlInput.style.background = 'transparent';
      this.htmlInput.style.color = 'transparent';
      this.htmlInput.style.caretColor = 'transparent';
      document.body.appendChild(this.htmlInput);

      this.htmlInputHandler = (e) => {
        const raw = (e.target.value || '').toUpperCase();
        // Filtruj do dozwolonych znaków: A-Z, 0-9, spacja.
        const filtered = raw.replace(/[^A-Z0-9 ]/g, '').slice(0, this.maxLength);
        this.value = filtered;
        e.target.value = filtered;
        this.refresh();
      };
      this.htmlInput.addEventListener('input', this.htmlInputHandler);
      this.htmlInputKeyHandler = (e) => {
        if (e.key === 'Enter') {
          if (this.value.length > 0) this.onEnter(this.value);
          this.htmlInput.blur();
        }
      };
      this.htmlInput.addEventListener('keydown', this.htmlInputKeyHandler);

      // Focus html input na klik w naszym tekstowym polu — to wywołuje
      // soft keyboard.
      this.bg.setInteractive({ useHandCursor: true });
      this.bg.on('pointerdown', () => {
        try { this.htmlInput.focus(); } catch (e) { /* ignore */ }
      });

      // visualViewport API — wykrywa gdy soft keyboard się otwiera/zamyka
      // (window.innerHeight zostaje, ale visualViewport.height zmienia).
      // Przy otwartej keyboard scrollujemy kamerę żeby UI było widoczne.
      if (window.visualViewport) {
        this.viewportListener = () => {
          const offsetY = window.innerHeight - window.visualViewport.height;
          // offsetY > 100 = keyboard otwarta (przybliżenie).
          if (offsetY > 100) {
            scene.cameras.main.setScroll(0, 100);
          } else {
            scene.cameras.main.setScroll(0, 0);
          }
        };
        window.visualViewport.addEventListener('resize', this.viewportListener);
      }
    }
  }

  displayValue() {
    if (this.value.length === 0) return '_';
    if (this.value.length < this.maxLength) return `${this.value}_`;
    return this.value;
  }

  handleKey(event) {
    if (event.key === 'Enter') {
      if (this.value.length > 0) this.onEnter(this.value);
      return;
    }
    if (event.key === 'Backspace') {
      if (this.value.length > 0) {
        this.value = this.value.slice(0, -1);
        this.refresh();
      }
      return;
    }
    if (event.key === ' ' || (event.key.length === 1 && /[A-Za-z0-9]/.test(event.key))) {
      if (this.value.length >= this.maxLength) return;
      const ch = event.key === ' ' ? ' ' : event.key.toUpperCase();
      const test = this.value + ch;
      if (this.allowedRegex.test(test)) {
        this.value = test;
        this.refresh();
      }
    }
  }

  refresh() {
    this.text.setText(this.displayValue());
    this.text.setAlpha(1);
    this.onChange(this.value);
  }

  setValue(v) {
    this.value = v ?? '';
    this.refresh();
  }

  shake() {
    const orig = this.bg.x;
    this.scene.tweens.add({
      targets: this.bg,
      x: orig + 10,
      duration: 60,
      yoyo: true,
      repeat: 3,
      onComplete: () => { this.bg.x = orig; },
    });
    const tx = this.text.x;
    this.scene.tweens.add({
      targets: this.text,
      x: tx + 10,
      duration: 60,
      yoyo: true,
      repeat: 3,
      onComplete: () => { this.text.x = tx; },
    });
  }

  destroy() {
    if (this.scene?.input?.keyboard) {
      this.scene.input.keyboard.off('keydown', this.keyHandler);
    }
    if (this.cursorBlink) this.cursorBlink.stop();
    if (this.bg) this.bg.destroy();
    if (this.text) this.text.destroy();
    if (this.htmlInput) {
      try {
        this.htmlInput.removeEventListener('input', this.htmlInputHandler);
        this.htmlInput.removeEventListener('keydown', this.htmlInputKeyHandler);
        document.body.removeChild(this.htmlInput);
      } catch (e) { /* ignore */ }
      this.htmlInput = null;
    }
    if (this.viewportListener && window.visualViewport) {
      try {
        window.visualViewport.removeEventListener('resize', this.viewportListener);
      } catch (e) { /* ignore */ }
      this.viewportListener = null;
    }
    // Reset camera scroll na wyjściu (na wszelki wypadek jeśli był offset).
    try { this.scene?.cameras?.main?.setScroll(0, 0); } catch (e) { /* ignore */ }
  }
}
