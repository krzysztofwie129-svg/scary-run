// Entry point gry — inicjalizacja Phaser z konfiguracją global'ą.
// Załączane przez index.html jako module script.

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PHYSICS_GRAVITY } from './config.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { NameInputScene } from './scenes/NameInputScene.js';
import { NameSplashScene } from './scenes/NameSplashScene.js';
import { CharSelectScene } from './scenes/CharSelectScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { LevelCompleteScene } from './scenes/LevelCompleteScene.js';
import { GameCompleteScene } from './scenes/GameCompleteScene.js';
import { LeaderboardScene } from './scenes/LeaderboardScene.js';
import { PlayerTurnSplashScene } from './scenes/PlayerTurnSplashScene.js';
import { SessionResultsScene } from './scenes/SessionResultsScene.js';
import { onOrientationChange, isMobile, isPortrait } from './utils/DeviceDetect.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#1a0a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game-container',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    expandParent: false,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: PHYSICS_GRAVITY },
      debug: false,
    },
  },
  // Multi-touch żeby jump + slide mogły zadziałać równolegle (np. szybki
  // tap top + tap bottom).
  input: { activePointers: 3 },
  scene: [
    BootScene,
    PreloadScene,
    MenuScene,
    NameInputScene,
    NameSplashScene,
    CharSelectScene,
    PlayerTurnSplashScene,
    GameScene,
    GameOverScene,
    LevelCompleteScene,
    GameCompleteScene,
    LeaderboardScene,
    SessionResultsScene,
  ],
};

const game = new Phaser.Game(config);

// JS-driven orientation handling. Dodajemy/usuwamy klasę .rotated na
// kontenerze gry żeby CSS rotacji się odpalił dla mobile + portrait.
// Dlaczego nie czysto CSS @media? — DevTools mobile emulation często nie
// matche'uje (hover:none) and (pointer:coarse), przez co @media nie
// odpalał na realnych telefonach które ich nie raportują. JS detection
// (touch + window dimensions) jest niezawodne.
function applyOrientationClass() {
  const container = document.getElementById('game-container');
  if (!container) return;
  const shouldRotate = isMobile() && isPortrait();
  if (shouldRotate) {
    container.classList.add('rotated');
  } else {
    container.classList.remove('rotated');
  }
  // Phaser musi przeliczyć rozmiar canvasu po zmianie wymiarów rodzica.
  game.scale.refresh();
}

// Initial — po Phaser boot, daj DOM chwilę.
setTimeout(applyOrientationClass, 100);
onOrientationChange(applyOrientationClass);
