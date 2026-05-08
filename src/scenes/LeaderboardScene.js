// LeaderboardScene — top 10 GLOBALNY z assetami portretowymi (sesja 8.x):
//   • leaderboard_bg (Halloween cemetery)
//   • leaderboard_title (TOP 10 z bat wings + skull)
//   • leaderboard_table (gold-frame purple table z baked headers # GRACZ
//     WYNIK POZIOM MONETY DATA)
//   • leaderboard_back (WRÓĆ button z gold wings)
//
// Headers są baked w teksturze tabeli — overlay-ujemy tylko 10 wierszy danych
// pod header bar.

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

    // BG full-screen.
    if (this.textures.exists('leaderboard_bg')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'leaderboard_bg')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    } else if (this.textures.exists('bg_level3_layer1')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_level3_layer1')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
        .setAlpha(0.5);
    }

    // Title TOP 10 — top center.
    if (this.textures.exists('leaderboard_title')) {
      this.add.image(GAME_WIDTH / 2, 75, 'leaderboard_title').setDisplaySize(440, 195);
    } else {
      this.add.text(GAME_WIDTH / 2, 60, 'TOP 10', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '64px',
        color: '#ffe066',
        stroke: '#3a1d5a',
        strokeThickness: 8,
      }).setOrigin(0.5);
    }

    // Table frame — wysoka tabela tuż pod logo, prawie do WRÓĆ.
    this.tableX = GAME_WIDTH / 2;
    this.tableY = 420;
    this.tableW = 1140;
    this.tableH = 470;
    if (this.textures.exists('leaderboard_table')) {
      this.add.image(this.tableX, this.tableY, 'leaderboard_table')
        .setDisplaySize(this.tableW, this.tableH);
    }

    // Back button — bottom.
    const backBtnY = GAME_HEIGHT - 38;
    if (this.textures.exists('leaderboard_back')) {
      const btn = this.add.image(GAME_WIDTH / 2, backBtnY, 'leaderboard_back')
        .setDisplaySize(280, 70)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setScale(btn.scaleX * 1.05, btn.scaleY * 1.05));
      btn.on('pointerout', () => btn.setScale(btn.scaleX / 1.05, btn.scaleY / 1.05));
      btn.on('pointerup', () => this.handleBack());
    } else {
      this.buildFallbackBack(GAME_WIDTH / 2, backBtnY);
    }

    // Loading placeholder podczas async fetch.
    this.loadingText = this.add.text(GAME_WIDTH / 2, this.tableY, 'Wczytywanie...', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#bdaee3',
      fontStyle: 'italic',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    Leaderboard.loadAsync().then((entries) => {
      if (this.loadingText) {
        this.loadingText.destroy();
        this.loadingText = null;
      }
      if (entries.length === 0) {
        this.add.text(GAME_WIDTH / 2, this.tableY, 'No scores yet — play to be the first!', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '24px',
          color: '#bdaee3',
          fontStyle: 'italic',
          stroke: '#000',
          strokeThickness: 3,
        }).setOrigin(0.5);
      } else {
        this.renderRows(entries);
      }
    });

    this.input.keyboard?.on('keydown-ESC', () => this.handleBack());
    this.input.keyboard?.on('keydown-SPACE', () => this.handleBack());
    this.input.keyboard?.on('keydown-ENTER', () => this.handleBack());
  }

  handleBack() {
    this.audioManager?.playSfx('click');
    this.scene.start('MenuScene');
  }

  renderRows(entries) {
    // Source table image (1200×675 lossless): header bar y=90-140, data area
    // y=140-595. Header occupies ~21% of height (to y=140/675), data area
    // 67.4% (y=140 to y=595), 10 rows × 6.74% each.
    const tableLeft = this.tableX - this.tableW / 2;
    const tableTop = this.tableY - this.tableH / 2;
    const headerBottomY = tableTop + this.tableH * 0.21;
    const rowH = this.tableH * 0.0674;

    // Column X positions — aligned z text labels w baked header (nie z ikonami,
    // które są na lewo od labelu). Procenty kolumn: # 7%, GRACZ 25%, WYNIK 44%,
    // POZIOM 60%, MONETY 76%, DATA 91%.
    const cols = {
      rank:  tableLeft + this.tableW * 0.07,
      name:  tableLeft + this.tableW * 0.25,
      score: tableLeft + this.tableW * 0.44,
      level: tableLeft + this.tableW * 0.60,
      coins: tableLeft + this.tableW * 0.76,
      date:  tableLeft + this.tableW * 0.91,
    };

    const baseStyle = {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '20px',
      color: '#e8d8ff',
      stroke: '#000',
      strokeThickness: 3,
    };
    const goldStyle = { ...baseStyle, color: '#ffd93c' };
    const silverStyle = { ...baseStyle, color: '#dadada' };
    const bronzeStyle = { ...baseStyle, color: '#e89c5a' };

    entries.slice(0, 10).forEach((e, i) => {
      const y = headerBottomY + rowH / 2 + i * rowH;
      let style = baseStyle;
      if (i === 0) style = goldStyle;
      else if (i === 1) style = silverStyle;
      else if (i === 2) style = bronzeStyle;

      const levelLabel = e.level > LEVELS.length ? 'ALL' : `${e.level}`;
      this.add.text(cols.rank, y, `${i + 1}.`, style).setOrigin(0.5);
      this.add.text(cols.name, y, String(e.name).slice(0, 12), style).setOrigin(0.5);
      this.add.text(cols.score, y, formatScore(e.score), style).setOrigin(0.5);
      this.add.text(cols.level, y, levelLabel, style).setOrigin(0.5);
      this.add.text(cols.coins, y, String(e.coins ?? 0), style).setOrigin(0.5);
      this.add.text(cols.date, y, Leaderboard.formatDate(e.date), style).setOrigin(0.5);
    });
  }

  buildFallbackBack(x, y) {
    const w = 240;
    const h = 60;
    const gfx = this.add.graphics();
    gfx.fillStyle(0x4a2796, 1);
    gfx.fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    gfx.lineStyle(3, 0xffe066, 1);
    gfx.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 14);
    this.add.text(x, y, 'WRÓĆ', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '26px',
      color: '#fff',
    }).setOrigin(0.5);
    this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true })
      .on('pointerup', () => this.handleBack());
  }
}
