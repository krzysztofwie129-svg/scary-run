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
  }
}
