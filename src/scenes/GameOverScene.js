// GameOverScene — gracz stracił wszystkie życia.
// SP: RESTART (ten sam level, fresh stats) + MAIN MENU.
// MP: NEXT PLAYER (jeśli są kolejni) lub SHOW RESULTS.
// Zapis do leaderboard zawsze (bez względu na SP/MP).

import { GAME_WIDTH, GAME_HEIGHT, LEVELS } from '../config.js';
import { sessionManager } from '../utils/SessionManager.js';
import { Leaderboard } from '../utils/Leaderboard.js';
import { AudioManager } from '../utils/AudioManager.js';
import { formatScore } from '../utils/format.js';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init() {
    const player = sessionManager.currentPlayer();
    this.player = player;
    sessionManager.finishCurrentPlayer();

    // Zapis do leaderboard. level zapisujemy jako 1-based (level reached).
    this.rank = Leaderboard.add({
      name: player.name || 'Anon',
      score: Math.floor(player.score),
      level: player.level + 1,
      coins: player.coins,
    });
    this.isHighScore = this.rank >= 0;
  }

  create() {
    this.audioManager = new AudioManager(this);

    if (this.textures.exists('bg_layer_00')) {
      const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_layer_00');
      bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    }
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add.text(GAME_WIDTH / 2, 130, 'GAME OVER', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '88px',
      color: '#ff6b6b',
      stroke: '#3a0a0a',
      strokeThickness: 8,
      shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 16, fill: true },
    }).setOrigin(0.5);

    if (sessionManager.isMultiplayer) {
      this.add.text(GAME_WIDTH / 2, 200, `${this.player.name} (P${sessionManager.currentPlayerIndex + 1})`, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '32px',
        color: '#ffe066',
        stroke: '#000',
        strokeThickness: 4,
      }).setOrigin(0.5);
    }

    const labelY = sessionManager.isMultiplayer ? 260 : 220;
    this.add.text(GAME_WIDTH / 2, labelY, `Score: ${formatScore(this.player.score)}`, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '48px',
      color: '#ffe066',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    const lvlReached = this.player.level + 1;
    this.add.text(GAME_WIDTH / 2, labelY + 60, `Level reached: ${Math.min(lvlReached, LEVELS.length)} / ${LEVELS.length}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#bdaee3',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    if (this.isHighScore) {
      const hs = this.add.text(GAME_WIDTH / 2, labelY + 110, `★ NEW HIGH SCORE — Rank #${this.rank + 1} ★`, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '26px',
        color: '#ffd93c',
        stroke: '#000',
        strokeThickness: 4,
      }).setOrigin(0.5);
      this.tweens.add({ targets: hs, scale: 1.1, duration: 600, yoyo: true, repeat: -1 });
    }

    // Buttons.
    const buttons = this.makeButtonsForFlow();
    this.bindKbNav(buttons);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, '← → wybór · SPACE / ENTER zatwierdź', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#bdaee3',
    }).setOrigin(0.5);
  }

  makeButtonsForFlow() {
    const cy = GAME_HEIGHT - 130;
    const left = GAME_WIDTH / 2 - 180;
    const right = GAME_WIDTH / 2 + 180;

    if (sessionManager.isMultiplayer) {
      if (sessionManager.hasNextPlayer()) {
        return [
          this.makeButton(left, cy, 'NEXT PLAYER', 0x6b3eb6, () => {
            this.audioManager.playSfx('click');
            sessionManager.nextPlayer();
            this.scene.start('PlayerTurnSplashScene');
          }),
          this.makeButton(right, cy, 'MAIN MENU', 0x3e6bb6, () => {
            this.audioManager.playSfx('click');
            sessionManager.reset();
            this.scene.start('MenuScene');
          }),
        ];
      }
      return [
        this.makeButton(left, cy, 'SHOW RESULTS', 0x6b3eb6, () => {
          this.audioManager.playSfx('click');
          this.scene.start('SessionResultsScene');
        }),
        this.makeButton(right, cy, 'MAIN MENU', 0x3e6bb6, () => {
          this.audioManager.playSfx('click');
          sessionManager.reset();
          this.scene.start('MenuScene');
        }),
      ];
    }

    // Single player.
    return [
      this.makeButton(left, cy, 'RESTART', 0x6b3eb6, () => {
        this.audioManager.playSfx('click');
        // Reset stats bieżącego gracza (level pozostaje), nowy lifeline.
        sessionManager.restartCurrentPlayer();
        this.scene.start('GameScene');
      }),
      this.makeButton(right, cy, 'MAIN MENU', 0x3e6bb6, () => {
        this.audioManager.playSfx('click');
        sessionManager.reset();
        this.scene.start('MenuScene');
      }),
    ];
  }

  makeButton(centerX, centerY, label, fillColor, onClick) {
    const w = 280;
    const h = 70;
    const x = centerX - w / 2;
    const y = centerY - h / 2;

    const gfx = this.add.graphics();
    let isFocused = false;
    const draw = (fill) => {
      gfx.clear();
      gfx.fillStyle(fill, 1);
      gfx.fillRoundedRect(x, y, w, h, 16);
      gfx.lineStyle(isFocused ? 6 : 3, 0xffe066, 1);
      gfx.strokeRoundedRect(x, y, w, h, 16);
    };
    draw(fillColor);

    const text = this.add.text(centerX, centerY, label, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '26px',
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
    this.input.keyboard.on('keydown-A', () => move(-1));
    this.input.keyboard.on('keydown-RIGHT', () => move(1));
    this.input.keyboard.on('keydown-D', () => move(1));
    this.input.keyboard.on('keydown-SPACE', () => buttons[idx].onClick());
    this.input.keyboard.on('keydown-ENTER', () => buttons[idx].onClick());
  }
}
