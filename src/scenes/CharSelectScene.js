// CharSelectScene — wybór postaci dla bieżącego gracza (sessionManager.currentPlayer()).
// 3 postacie obok siebie z idle anim, klawiatura ←/→ + SPACE/ENTER.

import {
  GAME_WIDTH,
  GAME_HEIGHT,
  CHARACTER_INFO,
  ANIM_FRAME_COUNTS,
  CHARACTER_FRAME,
} from '../config.js';
import { AudioManager } from '../utils/AudioManager.js';
import { sessionManager } from '../utils/SessionManager.js';
import { isMobileDevice } from '../utils/DeviceDetect.js';

const pad2 = (n) => String(n).padStart(2, '0');

function ensureAnim(scene, charKey, anim, frameRate) {
  const animKey = `${charKey}_${anim}_anim`;
  if (scene.anims.exists(animKey)) return animKey;
  const count = ANIM_FRAME_COUNTS[anim];
  const frames = [];
  for (let i = 0; i < count; i++) {
    frames.push({ key: `${charKey}_${anim}_${pad2(i)}` });
  }
  scene.anims.create({ key: animKey, frames, frameRate, repeat: -1 });
  return animKey;
}

export class CharSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CharSelectScene' });
  }

  create() {
    this.audioManager = new AudioManager(this);
    const player = sessionManager.currentPlayer();

    if (this.textures.exists('bg_layer_00')) {
      const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_layer_00');
      bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    }

    const title = sessionManager.isMultiplayer
      ? `${player.name} — choose your runner`
      : `${player.name} — choose your runner`;
    this.add.text(GAME_WIDTH / 2, 80, title, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '48px',
      color: '#ffe066',
      stroke: '#3a1d5a',
      strokeThickness: 6,
      shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 12, fill: true },
    }).setOrigin(0.5);

    const charY = GAME_HEIGHT / 2 + 30;
    const slotWidth = GAME_WIDTH / 3;
    const scale = 0.5;

    this.selectedIndex = 0;
    this.charSprites = [];
    this.charFrames = [];

    CHARACTER_INFO.forEach((info, idx) => {
      const x = slotWidth * idx + slotWidth / 2;

      const sprite = this.add.sprite(x, charY, `${info.key}_idle_00`);
      sprite.setOrigin(CHARACTER_FRAME.originX, CHARACTER_FRAME.originY);
      sprite.setScale(scale);
      const animKey = ensureAnim(this, info.key, 'idle', 12);
      sprite.play(animKey);

      const visibleW = CHARACTER_FRAME.width * scale * 0.5;
      const visibleH = CHARACTER_FRAME.height * scale * 0.7;
      const frameGfx = this.add.graphics();
      const drawFrame = (visible) => {
        frameGfx.clear();
        if (!visible) return;
        frameGfx.lineStyle(4, 0xffe066, 1);
        frameGfx.strokeRoundedRect(
          x - visibleW / 2,
          charY - visibleH * CHARACTER_FRAME.originY,
          visibleW,
          visibleH,
          12,
        );
      };
      this.charFrames.push({ gfx: frameGfx, drawFrame });

      this.add.text(x, charY + 60, info.name, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '32px',
        color: '#ffe066',
        stroke: '#000',
        strokeThickness: 4,
      }).setOrigin(0.5);
      this.add.text(x, charY + 100, info.description, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#e8d8ff',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0.5);

      const hitZone = this.add.zone(x, charY - visibleH * 0.1, visibleW, visibleH)
        .setInteractive({ useHandCursor: true });
      hitZone.on('pointerover', () => sprite.setScale(scale * 1.05));
      hitZone.on('pointerout', () => sprite.setScale(scale));
      hitZone.on('pointerdown', () => this.select(idx));
      hitZone.on('pointerup', () => this.confirm());

      this.charSprites.push({ key: info.key, sprite });
    });

    this.refreshSelection();

    // Klawiatura.
    const move = (delta) => this.select((this.selectedIndex + delta + CHARACTER_INFO.length) % CHARACTER_INFO.length);
    this.input.keyboard?.on('keydown-LEFT', () => move(-1));
    this.input.keyboard?.on('keydown-A', () => move(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => move(1));
    this.input.keyboard?.on('keydown-D', () => move(1));
    this.input.keyboard?.on('keydown-SPACE', () => this.confirm());
    this.input.keyboard?.on('keydown-ENTER', () => this.confirm());

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 20, 'Tap postaci aby wybrac i rozpoczac', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#bdaee3',
    }).setOrigin(0.5);

    if (isMobileDevice()) {
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50, 'Tap GORA aby skoczyc  •  Tap DOL aby slizgac', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        color: '#ffd93c',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(10000);
    }
  }

  select(idx) {
    this.selectedIndex = idx;
    this.refreshSelection();
  }

  refreshSelection() {
    this.charFrames.forEach((f, i) => f.drawFrame(i === this.selectedIndex));
  }

  confirm() {
    const charKey = CHARACTER_INFO[this.selectedIndex].key;
    sessionManager.setCharacter(charKey);
    this.audioManager.playSfx('click');
    this.scene.start('GameScene');
  }
}
