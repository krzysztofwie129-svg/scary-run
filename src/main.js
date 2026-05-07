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
import { OrientationLockScene } from './scenes/OrientationLockScene.js';
import { isMobile, isPortrait, onOrientationChange } from './utils/DeviceDetect.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a0a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: 'game-container',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
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
    OrientationLockScene,
  ],
};

const game = new Phaser.Game(config);

// Orientation lock — overlay scene na portrait mobile.
function checkOrientation() {
  const shouldLock = isMobile() && isPortrait();
  const isOrientationActive = game.scene.isActive('OrientationLockScene');
  if (shouldLock && !isOrientationActive) {
    game.scene.run('OrientationLockScene');
  } else if (!shouldLock && isOrientationActive) {
    game.scene.stop('OrientationLockScene');
  }
}

// Initial check (po małym opóźnieniu — Phaser potrzebuje chwili na boot).
setTimeout(checkOrientation, 200);
onOrientationChange(checkOrientation);
