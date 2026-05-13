// Entry point gry — Phaser config + start. Mobile-only (sesja 7).
// NIE ma klawiatury, myszki, CSS rotacji, setRealHeight, resize listenerów.
// OrientationGuard pilnuje czy gracz na telefonie + landscape — jeśli nie,
// pokazuje OrientationLockScene.

import { initSentry } from './utils/SentryInit.js';
import { attachGlobalErrorHandlers } from './utils/ErrorOverlay.js';
import { initialLoad as playerSyncInitialLoad } from './utils/PlayerSync.js';
initSentry();
attachGlobalErrorHandlers();

// DEV: ?difficulty=easy|normal|hard w URL ustawia tryb przed bootem.
try {
  const _p = new URLSearchParams(window.location.search);
  const _d = _p.get('difficulty');
  if (_d && ['easy', 'normal', 'hard'].includes(_d)) {
    localStorage.setItem('scaryrun_difficulty', _d);
  }
} catch (e) { /* ignore */ }

// 2026-05-13: KV sync MUSI skończyć przed start gry — inaczej race condition,
// MenuScene 'play' action czyta game_currentLevel ZANIM snapshot z KV się
// załadował → user widzi L1 zamiast highest unlocked. Krzysztof zaczynał od L1
// mimo unlock L18. window.__playerSyncReady to Promise dostępny dla scen.
window.__playerSyncReady = playerSyncInitialLoad().catch((e) => {
  console.warn('[main] initialLoad failed:', e?.message);
});

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
import { BossChoiceScene } from './scenes/BossChoiceScene.js';
import { DeathScene } from './scenes/DeathScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { SettingsScene } from './scenes/SettingsScene.js';

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
  // Quality: WebGL antialiasing ON dla downscaled images (LevelComplete UI 900×300
  // → display ~420×120 wymaga LINEAR filtering żeby nie wyglądało pikselowato).
  render: {
    antialias: true,
    antialiasGL: true,
    pixelArt: false,
    roundPixels: false,
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
    DeathScene,
    GameOverScene,
    LevelCompleteScene,
    ChestSelectScene,
    BossChoiceScene,
    BossFightScene,
    GameCompleteScene,
    LeaderboardScene,
    ShopScene,
    SettingsScene,
    SessionResultsScene,
    OrientationLockScene,
  ],
};

// Phaser init wrapped w try-catch — jeśli wywali się np. na bardzo starym
// browserze bez WebGL/Canvas2D wsparcia, pokazujemy fallback z index.html.
let game = null;
try {
  game = new Phaser.Game(config);
  if (import.meta.env?.DEV) window.__game = game;
  // OrientationGuard.init rejestruje listenery, ale `check()` jest gated
  // przez flagę `started` — sprawdzanie odpala się DOPIERO gdy PreloadScene
  // wywoła `orientationGuard.start()` po complete eventcie ładowania.
  // Dzięki temu rotation overlay nie nakłada się na loading bar (sesja 7.3).
  orientationGuard.init(game);

  // 2026-05-13: WebGL context lost handler — iOS/Android tracą context przy
  // background tab / memory pressure / app switch / orientation rotation.
  // Phaser dispatchContextRestored próbuje re-link shadery + re-create framebuffers
  // → "Link Shader failed:" / "Framebuffer status: Framebuffer Unsupported" crash.
  // Sentry: bfc06568 (shader), d749403c (framebuffer). Both unhandled,
  // dispatchContextRestored mechanism.
  // Fix: BLOKUJ Phaser recovery przez capture-phase listener PRZED bubble do Phaser.
  // Plus auto-reload — fresh page = fresh WebGL context bez prób recovery.
  try {
    const canvas = game.canvas;
    if (canvas) {
      const onContextLost = (e) => {
        try { window.Sentry?.addBreadcrumb?.({ category: 'webgl', message: 'webglcontextlost', level: 'warning' }); } catch (_) {}
        console.warn('[WebGL] context lost — auto-reload');
        e.preventDefault();
        _scheduleReload('webglcontextlost', 250);
      };
      const onContextRestored = (e) => {
        try { window.Sentry?.addBreadcrumb?.({ category: 'webgl', message: 'webglcontextrestored (blocked Phaser recovery)', level: 'warning' }); } catch (_) {}
        console.warn('[WebGL] context restored — blocking Phaser recovery (already reloading)');
        e.stopImmediatePropagation?.();
      };
      // CAPTURE phase (3rd arg true) — fire PRZED Phaser internal listener.
      canvas.addEventListener('webglcontextlost', onContextLost, true);
      canvas.addEventListener('webglcontextrestored', onContextRestored, true);
    }
  } catch (_) { /* canvas not ready or no WebGL */ }
} catch (e) {
  console.error('Game init failed:', e);
  const fallback = document.getElementById('browser-fallback');
  if (fallback) fallback.style.display = 'flex';
}

// 2026-05-13: globalny safety net dla wszystkich WebGL recovery crashes.
// dispatchContextRestored → Phaser próbuje re-link shadery / re-create FBO /
// re-upload textures → każdy może fail z innym message. Reload zawsze.
const WEBGL_CRASH_PATTERNS = /Link Shader failed|Framebuffer status|Framebuffer Unsupported|FRAMEBUFFER_(IN)?COMPLETE|gl\.linkProgram|createResource/i;
function _isWebglCrash(msg) {
  return typeof msg === 'string' && WEBGL_CRASH_PATTERNS.test(msg);
}

// Reload loop limit — gdy każdy reload powoduje kolejny crash (np. broken bundle,
// driver issue), nie wpadaj w infinite reload. Po MAX_RELOADS pokaz fallback.
const RELOAD_KEY = 'scary_run_webgl_reload_count';
const RELOAD_MAX = 3;
const RELOAD_WINDOW_MS = 60_000; // licznik reset po 60s bez crashu
function _scheduleReload(reason, delay = 500) {
  try {
    const now = Date.now();
    const raw = sessionStorage.getItem(RELOAD_KEY);
    let state = raw ? JSON.parse(raw) : { count: 0, firstAt: now };
    // Reset window jeśli stary licznik.
    if (now - state.firstAt > RELOAD_WINDOW_MS) state = { count: 0, firstAt: now };
    state.count++;
    sessionStorage.setItem(RELOAD_KEY, JSON.stringify(state));
    if (state.count > RELOAD_MAX) {
      console.error(`[WebGL] reload loop limit (${RELOAD_MAX}) reached, showing fallback`);
      try {
        window.Sentry?.captureMessage?.(`WebGL reload loop limit: ${reason}`, 'error');
      } catch (_) {}
      const fb = document.getElementById('browser-fallback');
      if (fb) {
        fb.style.display = 'flex';
        fb.innerHTML = '<div style="text-align:center;padding:40px;color:#fff;font-family:sans-serif"><h2 style="color:#ffd93c">Problem z grafiką</h2><p>Twoja przeglądarka traci kontekst WebGL. Spróbuj:</p><ul style="text-align:left;display:inline-block"><li>Zamknij inne karty</li><li>Restart przeglądarki</li><li>Update systemu</li></ul></div>';
      }
      return;
    }
    setTimeout(() => { try { window.location.reload(); } catch (_) {} }, delay);
  } catch (_) {
    // sessionStorage błąd → fallback do prostego reload bez limit
    setTimeout(() => { try { window.location.reload(); } catch (_) {} }, delay);
  }
}

// Reset reload counter po pomyślnym uruchomieniu (60s bez crashu = zdrowy state).
setTimeout(() => {
  try { sessionStorage.removeItem(RELOAD_KEY); } catch (_) {}
}, RELOAD_WINDOW_MS);

window.addEventListener('error', (ev) => {
  const m = ev?.error?.message || ev?.message || '';
  if (_isWebglCrash(m)) {
    try { window.Sentry?.addBreadcrumb?.({ category: 'webgl', message: `error: ${m.slice(0, 80)}`, level: 'error' }); } catch (_) {}
    console.warn('[WebGL] recovery crash — auto-reload:', m.slice(0, 80));
    ev.preventDefault?.();
    _scheduleReload('error:' + m.slice(0, 40), 500);
  }
});
// Plus unhandledrejection — niektóre WebGL recovery errors fire jako Promise reject.
window.addEventListener('unhandledrejection', (ev) => {
  const m = ev?.reason?.message || String(ev?.reason || '');
  if (_isWebglCrash(m)) {
    try { window.Sentry?.addBreadcrumb?.({ category: 'webgl', message: `rejection: ${m.slice(0, 80)}`, level: 'error' }); } catch (_) {}
    console.warn('[WebGL] recovery rejection — auto-reload:', m.slice(0, 80));
    ev.preventDefault?.();
    _scheduleReload('rejection:' + m.slice(0, 40), 500);
  }
});
