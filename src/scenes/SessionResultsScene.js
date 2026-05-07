// SessionResultsScene — po MP, pokazuje wyniki wszystkich graczy.
// Tabela: PLAYER | SCORE | LEVEL | COINS | LIVES LEFT.
// Highlighting: 1st złoty, 2nd srebrny, 3rd brązowy.

import {
  GAME_WIDTH,
  GAME_HEIGHT,
  LEVELS,
} from '../config.js';
import { sessionManager } from '../utils/SessionManager.js';
import { playFanfare } from '../utils/SuccessFanfare.js';
import { formatScore } from '../utils/format.js';

const SPARK_KEY = '__spark_4x4';

export class SessionResultsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'SessionResultsScene' });
  }

  create() {
    const overlay = this.add.graphics();
    overlay.fillStyle(0x1a0a2e, 1);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add.text(GAME_WIDTH / 2, 80, 'SESSION RESULTS', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '64px',
      color: '#ffe066',
      stroke: '#3a1d5a',
      strokeThickness: 8,
      shadow: { offsetX: 2, offsetY: 4, color: '#000', blur: 12, fill: true },
    }).setOrigin(0.5);

    const sorted = sessionManager.getResultsSorted();
    this.renderTable(sorted);

    // Confetti dla zwycięzcy.
    this.spawnConfetti();
    playFanfare();

    // Buttons.
    const buttons = [
      this.makeButton(GAME_WIDTH / 2 - 180, GAME_HEIGHT - 70, 'PLAY AGAIN', 0x6b3eb6, () => {
        // Te same imiona, reset stats.
        const names = sessionManager.players.map((p) => p.name);
        if (sessionManager.isMultiplayer) sessionManager.setupMultiplayer(names.length);
        else sessionManager.setupSinglePlayer(names[0] || '');
        names.forEach((n, i) => sessionManager.setName(i, n));
        this.scene.start('CharSelectScene');
      }),
      this.makeButton(GAME_WIDTH / 2 + 180, GAME_HEIGHT - 70, 'MAIN MENU', 0x3e6bb6, () => {
        sessionManager.reset();
        this.scene.start('MenuScene');
      }),
    ];
    this.bindKbNav(buttons);
  }

  renderTable(sorted) {
    const headerY = 170;
    const cols = [
      { x: 80, label: 'RANK' },
      { x: 200, label: 'PLAYER' },
      { x: 500, label: 'SCORE' },
      { x: 700, label: 'LEVEL' },
      { x: 880, label: 'COINS' },
      { x: 1060, label: 'LIVES' },
    ];
    const headerStyle = {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '20px',
      color: '#ffd93c',
      stroke: '#000',
      strokeThickness: 3,
    };
    for (const col of cols) this.add.text(col.x, headerY, col.label, headerStyle);

    const sep = this.add.graphics();
    sep.lineStyle(2, 0xffd93c, 0.5);
    sep.lineBetween(80, headerY + 30, GAME_WIDTH - 80, headerY + 30);

    const baseStyle = {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '24px',
      color: '#e8d8ff',
      stroke: '#000',
      strokeThickness: 3,
    };
    const colors = ['#ffd93c', '#cccccc', '#cd7f32']; // 1, 2, 3

    sorted.forEach((p, i) => {
      const y = headerY + 60 + i * 50;
      const style = { ...baseStyle, color: colors[i] || baseStyle.color };
      const levelLabel = p.level >= LEVELS.length ? 'ALL' : `${p.level + 1}`;
      this.add.text(cols[0].x, y, `${i + 1}.`, style);
      this.add.text(cols[1].x, y, p.name, style);
      this.add.text(cols[2].x, y, formatScore(p.score), style);
      this.add.text(cols[3].x, y, levelLabel, style);
      this.add.text(cols[4].x, y, String(p.coins), style);
      this.add.text(cols[5].x, y, String(p.lives), style);
    });
  }

  makeButton(centerX, centerY, label, fillColor, onClick) {
    const w = 280;
    const h = 60;
    const x = centerX - w / 2;
    const y = centerY - h / 2;

    const gfx = this.add.graphics();
    let isFocused = false;
    const draw = (fill) => {
      gfx.clear();
      gfx.fillStyle(fill, 1);
      gfx.fillRoundedRect(x, y, w, h, 14);
      gfx.lineStyle(isFocused ? 6 : 3, 0xffe066, 1);
      gfx.strokeRoundedRect(x, y, w, h, 14);
    };
    draw(fillColor);

    const text = this.add.text(centerX, centerY, label, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '24px',
      color: '#fff',
    }).setOrigin(0.5);

    const hit = this.add.zone(centerX, centerY, w, h).setInteractive({ useHandCursor: true });
    hit.on('pointerover', () => { draw(fillColor + 0x202020); text.setScale(1.05); });
    hit.on('pointerout', () => { draw(isFocused ? fillColor + 0x101010 : fillColor); text.setScale(isFocused ? 1.05 : 1); });
    hit.on('pointerup', onClick);

    return {
      onClick,
      setFocused(focused) {
        isFocused = focused;
        draw(focused ? fillColor + 0x101010 : fillColor);
        text.setScale(focused ? 1.05 : 1);
      },
    };
  }

  bindKbNav(buttons) {
    let idx = 0;
    const refresh = () => buttons.forEach((b, i) => b.setFocused(i === idx));
    refresh();
    const move = (delta) => { idx = (idx + delta + buttons.length) % buttons.length; refresh(); };
    this.input.keyboard.on('keydown-LEFT', () => move(-1));
    this.input.keyboard.on('keydown-RIGHT', () => move(1));
    this.input.keyboard.on('keydown-SPACE', () => buttons[idx].onClick());
    this.input.keyboard.on('keydown-ENTER', () => buttons[idx].onClick());
  }

  spawnConfetti() {
    if (!this.textures.exists(SPARK_KEY)) {
      const g = this.add.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture(SPARK_KEY, 4, 4);
      g.destroy();
    }
    this.add.particles(0, 0, SPARK_KEY, {
      x: { min: 0, max: GAME_WIDTH },
      y: -10,
      lifespan: 3000,
      gravityY: 200,
      speedY: { min: 50, max: 150 },
      speedX: { min: -50, max: 50 },
      scale: { start: 1.5, end: 0 },
      tint: [0xffd93c, 0x4ad8ff, 0xff8aff, 0xffffff],
      frequency: 40,
    });
  }
}
