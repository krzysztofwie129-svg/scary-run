// LeaderboardScene — top 10 z localStorage. RANK | NAME | SCORE | LEVEL | COINS | DATE.

import {
  GAME_WIDTH,
  GAME_HEIGHT,
  LEVELS,
} from '../config.js';
import { Leaderboard } from '../utils/Leaderboard.js';
import { AudioManager } from '../utils/AudioManager.js';
import { formatScore } from '../utils/format.js';

export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  create() {
    this.audioManager = new AudioManager(this);

    if (this.textures.exists('bg_level3_layer1')) {
      const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_level3_layer1');
      bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setAlpha(0.5);
    }
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.55);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add.text(GAME_WIDTH / 2, 60, 'TOP 10', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '64px',
      color: '#ffe066',
      stroke: '#3a1d5a',
      strokeThickness: 8,
      shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 12, fill: true },
    }).setOrigin(0.5);

    const entries = Leaderboard.load();

    if (entries.length === 0) {
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'No scores yet — play to be the first!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '28px',
        color: '#bdaee3',
        fontStyle: 'italic',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0.5);
    } else {
      this.renderTable(entries);
    }

    // BACK button.
    const onBack = () => {
      this.audioManager.playSfx('click');
      this.scene.start('MenuScene');
    };
    const btnY = GAME_HEIGHT - 180;
    const btnX = GAME_WIDTH / 2;
    const btnW = 240;
    const btnH = 60;
    const gfx = this.add.graphics();
    gfx.fillStyle(0x4a2796, 1);
    gfx.fillRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 14);
    gfx.lineStyle(3, 0xffe066, 1);
    gfx.strokeRoundedRect(btnX - btnW / 2, btnY - btnH / 2, btnW, btnH, 14);
    this.add.text(btnX, btnY, 'BACK', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '26px',
      color: '#fff',
    }).setOrigin(0.5);
    this.add.zone(btnX, btnY, btnW, btnH).setInteractive({ useHandCursor: true })
      .on('pointerup', onBack);

    this.input.keyboard?.on('keydown-ESC', onBack);
    this.input.keyboard?.on('keydown-SPACE', onBack);
    this.input.keyboard?.on('keydown-ENTER', onBack);
  }

  renderTable(entries) {
    // Nagłówki.
    const headerY = 140;
    const cols = [
      { x: 80, label: '#' },
      { x: 160, label: 'NAME' },
      { x: 460, label: 'SCORE' },
      { x: 660, label: 'LEVEL' },
      { x: 850, label: 'COINS' },
      { x: 1050, label: 'DATE' },
    ];
    const headerStyle = {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '20px',
      color: '#ffd93c',
      stroke: '#000',
      strokeThickness: 3,
    };
    for (const col of cols) {
      this.add.text(col.x, headerY, col.label, headerStyle);
    }

    // Linia pod nagłówkami.
    const sep = this.add.graphics();
    sep.lineStyle(2, 0xffd93c, 0.5);
    sep.lineBetween(80, headerY + 30, GAME_WIDTH - 80, headerY + 30);

    // Wiersze.
    const rowStyle = {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#e8d8ff',
      stroke: '#000',
      strokeThickness: 2,
    };
    const goldStyle = { ...rowStyle, color: '#ffd93c' };
    const silverStyle = { ...rowStyle, color: '#cccccc' };
    const bronzeStyle = { ...rowStyle, color: '#cd7f32' };

    entries.forEach((e, i) => {
      const y = headerY + 60 + i * 38;
      let style = rowStyle;
      if (i === 0) style = goldStyle;
      else if (i === 1) style = silverStyle;
      else if (i === 2) style = bronzeStyle;

      const levelLabel = e.level >= LEVELS.length ? 'ALL' : `${e.level}`;
      this.add.text(cols[0].x, y, `${i + 1}.`, style);
      this.add.text(cols[1].x, y, String(e.name).slice(0, 12), style);
      this.add.text(cols[2].x, y, formatScore(e.score), style);
      this.add.text(cols[3].x, y, levelLabel, style);
      this.add.text(cols[4].x, y, String(e.coins ?? 0), style);
      this.add.text(cols[5].x, y, Leaderboard.formatDate(e.date), style);
    });
  }
}
