// InstallPromptScene — overlay scene (sesja P3.1) instruujący iPhone Safari
// userów jak dodać grę na home screen (=fullscreen jak natywna apka).
// Launch (nie start) z MenuScene gdy InstallPromptManager.shouldShow() === true.

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { InstallPromptManager } from '../utils/InstallPromptManager.js';

export default class InstallPromptScene extends Phaser.Scene {
  constructor() {
    super({ key: 'InstallPromptScene' });
  }

  create() {
    const backdrop = this.add.rectangle(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT,
      0x000000, 0.7,
    ).setDepth(0);

    const modalW = 720;
    const modalH = 460;
    const modalX = GAME_WIDTH / 2;
    const modalY = GAME_HEIGHT / 2;

    this.add.rectangle(modalX, modalY, modalW, modalH, 0x1a0a2e)
      .setStrokeStyle(4, 0xffd93c)
      .setDepth(1);

    this.add.text(modalX, modalY - 170, '✨ ZAGRAJ NA PELNYM EKRANIE', {
      fontSize: '36px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffd93c',
      align: 'center',
      wordWrap: { width: modalW - 40 },
    }).setOrigin(0.5).setDepth(2);

    this.add.text(modalX, modalY - 50,
      'Aby zagrac w pelnym ekranie\n(jak natywna aplikacja):\n\n1. Tap przycisk SHARE  ⤴\n2. Wybierz "Add to Home Screen"\n3. Otworz Scary Run z pulpitu',
      {
        fontSize: '24px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 8,
      },
    ).setOrigin(0.5).setDepth(2);

    const dismissBtn = this.add.text(modalX, modalY + 150, 'ROZUMIEM', {
      fontSize: '32px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffffff',
      backgroundColor: '#5C3E70',
      padding: { x: 32, y: 12 },
    }).setOrigin(0.5).setInteractive().setDepth(2);

    const close = () => {
      InstallPromptManager.markDismissed();
      this.scene.stop();
    };

    dismissBtn.on('pointerdown', close);

    const closeX = this.add.text(modalX + modalW / 2 - 30, modalY - modalH / 2 + 20, '✕', {
      fontSize: '32px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffd93c',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setInteractive().setDepth(3);
    closeX.on('pointerdown', close);

    backdrop.setInteractive();
    backdrop.on('pointerdown', close);
  }
}
