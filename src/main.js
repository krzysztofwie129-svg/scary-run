// Entry point gry — Phaser config + start. Mobile-only (sesja 7).
// NIE ma klawiatury, myszki, CSS rotacji, setRealHeight, resize listenerów.
// OrientationGuard pilnuje czy gracz na telefonie + landscape — jeśli nie,
// pokazuje OrientationLockScene.

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PHYSICS_GRAVITY } from './config.js';
import { orientationGuard } from './utils/OrientationGuard.js';

import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { NameInputScene } from './scenes/NameInputScene.js';
import { NameSplashScene } from './scenes/NameSplashScene.js';
import { CharSelectScene } from './scenes/CharSelectScene.js';
import { GameScene } from './scenes/GameScene.js';
import { PauseScene } from './scenes/PauseScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { LevelCompleteScene } from './scenes/LevelCompleteScene.js';
import { GameCompleteScene } from './scenes/GameCompleteScene.js';
import { LeaderboardScene } from './scenes/LeaderboardScene.js';
import { PlayerTurnSplashScene } from './scenes/PlayerTurnSplashScene.js';
import { SessionResultsScene } from './scenes/SessionResultsScene.js';
import { OrientationLockScene } from './scenes/OrientationLockScene.js';
import InstallPromptScene from './scenes/InstallPromptScene.js';
import { ChestSelectScene } from './scenes/ChestSelectScene.js';
import { BossFightScene } from './scenes/BossFightScene.js';

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
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: PHYSICS_GRAVITY },
      debug: false,
    },
  },
  // Mobile-only: keyboard + mouse OFF, tylko touch + multi-pointer.
  // DEV: ?desktop=1 → włącz mouse (do testów na desktopie / puppeteer).
  input: {
    activePointers: 3,
    keyboard: false,
    mouse: typeof window !== 'undefined'
      && new URLSearchParams(window.location.search).has('desktop'),
    touch: true,
  },
  // Phaser renderuje sceny w kolejności array — późniejsze NA WIERZCHU.
  // OrientationLockScene musi być OSTATNIA żeby przykrywała wszystkie
  // pozostałe gdy aktywna (zapobiega "MenuScene widoczne pod OrientationLock").
  scene: [
    BootScene,
    PreloadScene,
    MenuScene,
    InstallPromptScene,
    NameSplashScene,
    NameInputScene,
    CharSelectScene,
    PlayerTurnSplashScene,
    GameScene,
    PauseScene,
    GameOverScene,
    LevelCompleteScene,
    ChestSelectScene,
    BossFightScene,
    GameCompleteScene,
    LeaderboardScene,
    SessionResultsScene,
    OrientationLockScene,
  ],
};

// Phaser init wrapped w try-catch — jeśli wywali się np. na bardzo starym
// browserze bez WebGL/Canvas2D wsparcia, pokazujemy fallback z index.html.
let game = null;
try {
  game = new Phaser.Game(config);
  // OrientationGuard.init rejestruje listenery, ale `check()` jest gated
  // przez flagę `started` — sprawdzanie odpala się DOPIERO gdy PreloadScene
  // wywoła `orientationGuard.start()` po complete eventcie ładowania.
  // Dzięki temu rotation overlay nie nakłada się na loading bar (sesja 7.3).
  orientationGuard.init(game);

  // TEMP DEBUG: scene transitions log overlay (do diagnostyki boss → chest buga).
  // Persistuje przez localStorage — przeżyje refresh / obrót telefonu.
  const debugEl = document.getElementById('debug-scene-log');
  if (debugEl) {
    const DEBUG_KEY = 'scary_run_debug_log_v1';
    const loadHistory = () => {
      try { return JSON.parse(localStorage.getItem(DEBUG_KEY) || '[]'); } catch (e) { return []; }
    };
    const saveHistory = (h) => {
      try { localStorage.setItem(DEBUG_KEY, JSON.stringify(h)); } catch (e) { /* ignore */ }
    };
    const history = loadHistory();
    debugEl.textContent = history.join('\n');
    let lastActive = '';
    const push = (line) => {
      history.push(line);
      while (history.length > 14) history.shift();
      saveHistory(history);
      debugEl.textContent = history.join('\n');
    };
    push(`-- ${new Date().toISOString().slice(11, 19)} pageload --`);
    setInterval(() => {
      const active = game.scene.scenes
        .filter((s) => s.scene.isActive())
        .map((s) => s.scene.key)
        .join(',');
      if (active !== lastActive) {
        const t = new Date().toISOString().slice(11, 19);
        push(`${t} ${active}`);
        lastActive = active;
      }
    }, 100);
    window.addEventListener('error', (e) => {
      const t = new Date().toISOString().slice(11, 19);
      push(`${t} ERR: ${e.message?.slice(0, 80)}`);
    });
    window.addEventListener('unhandledrejection', (e) => {
      const t = new Date().toISOString().slice(11, 19);
      push(`${t} UNHANDLED: ${(e.reason?.message || String(e.reason)).slice(0, 80)}`);
    });
  }
} catch (e) {
  console.error('Game init failed:', e);
  const fallback = document.getElementById('browser-fallback');
  if (fallback) fallback.style.display = 'flex';
}
