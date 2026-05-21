// Weryfikacja sesji 2026-05-21: desktop, settings redesign, boss icons, HUD.
// Wymaga: npm run dev (http://localhost:5173).
import puppeteer from 'puppeteer';
import fs from 'fs';

const BASE = 'http://localhost:5299';
const OUT = '/tmp/sr-verify';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const summary = [];
function rec(name, ok, detail = '') {
  summary.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${name}${detail ? ' :: ' + detail : ''}`);
}

// Filtr nieszkodliwych komunikatów. Pod `vite dev`:
//  - navigator.vibrate blokowane (brak gestu usera) — ostrzeżenie przeglądarki,
//  - /api/stats 404 — Cloudflare Functions nie działają pod gołym vite dev,
//  - asset frame 404 / audio decode race — znane, nieblokujące.
function realErrs(errs) {
  return errs.filter((e) => !/char0[4-7]_|Hit_\d|favicon|audio|decode|sentry|Sentry|navigator\.vibrate|chromestatus|api\/(stats|player|leaderboard)|reqfail: (stats|player|leaderboard)|status of 404/i.test(e));
}

const browser = await puppeteer.launch({ headless: 'new' });

async function mkPage(viewport, touch = false) {
  const page = await browser.newPage();
  await page.setViewport({ ...viewport, hasTouch: touch, isMobile: touch });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('requestfailed', (r) => errs.push('reqfail: ' + r.url().split('/').pop()));
  page.__errs = errs;
  return page;
}

const activeScenes = (page) => page.evaluate(() => {
  try { return window.__game.scene.getScenes(true).map((s) => s.scene.key); }
  catch (e) { return ['<no __game>']; }
});

// ============ TEST 1: Desktop play + Settings redesign ============
try {
  const page = await mkPage({ width: 1280, height: 720 }, false); // brak touch = desktop
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await sleep(6500);

  const s1 = await activeScenes(page);
  rec('Desktop: gra grywalna bez ?desktop=1 (OrientationLock nieaktywny)',
    !s1.includes('OrientationLockScene') && s1.some((k) => k === 'MenuScene'), s1.join(','));
  await page.screenshot({ path: `${OUT}/01_desktop_menu.png` });

  // Klik zębatki (mysz — wymaga input.mouse:true).
  await page.mouse.click(1125, 70);
  await sleep(1800);
  const s2 = await activeScenes(page);
  rec('Settings: otwiera się klikiem myszy na desktopie', s2.includes('SettingsScene'), s2.join(','));
  await page.screenshot({ path: `${OUT}/02_settings.png` });

  // Klik segmentu „Trudny".
  await page.mouse.click(504, 198);
  await sleep(700);
  await page.screenshot({ path: `${OUT}/03_settings_trudny.png` });

  // Modal resetu.
  await page.mouse.click(335, 498);
  await sleep(900);
  await page.screenshot({ path: `${OUT}/04_settings_reset_modal.png` });
  await page.mouse.click(770, 468); // Anuluj
  await sleep(700);

  rec('Settings: brak błędów konsoli', realErrs(page.__errs).length === 0,
    realErrs(page.__errs).slice(0, 3).join(' | '));
  await page.close();
} catch (e) {
  rec('TEST 1 (desktop/settings)', false, e.message);
}

// ============ TEST 2: Boss fight — ikony skoku/walki na górze ============
try {
  const page = await mkPage({ width: 1280, height: 720 }, false);
  await page.goto(`${BASE}/?boss=3`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await sleep(7000);
  const s = await activeScenes(page);
  rec('Boss: BossFightScene aktywna (?boss=3)', s.includes('BossFightScene'), s.join(','));
  await page.screenshot({ path: `${OUT}/05_boss_fight.png` });
  rec('Boss: brak błędów konsoli', realErrs(page.__errs).length === 0,
    realErrs(page.__errs).slice(0, 3).join(' | '));
  await page.close();
} catch (e) {
  rec('TEST 2 (boss)', false, e.message);
}

// ============ TEST 3: Chest → GameScene (HUD redesign + smoke fix #2) ============
try {
  const page = await mkPage({ width: 1280, height: 720 }, false);
  await page.goto(`${BASE}/?chest=random&level=2`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await sleep(6000);
  let s = await activeScenes(page);
  rec('Chest: ChestSelectScene aktywna', s.includes('ChestSelectScene'), s.join(','));
  await page.screenshot({ path: `${OUT}/06_chest.png` });

  // Klik środkowej skrzyni (GAME_WIDTH*0.5, GAME_HEIGHT*0.72).
  await page.mouse.click(640, 518);
  await sleep(3800); // shake + reveal + button delay
  await page.screenshot({ path: `${OUT}/07_chest_reward.png` });

  // KONTYNUUJ (GAME_WIDTH/2, GAME_HEIGHT-80) → applyAndContinue → GameScene.
  await page.mouse.click(640, 640);
  await sleep(2400); // krótko — zanim bot bez inputu wbiegnie w przeszkodę
  s = await activeScenes(page);
  await page.screenshot({ path: `${OUT}/08_hud_gameplay.png` });
  // GameScene / DeathScene oba dowodzą, że GameScene wstała (importy OK, brak crashu).
  rec('Chest→Game: GameScene wstaje po skrzynce (smoke: importy ScoreSystem/RankingSystem OK)',
    s.includes('GameScene') || s.includes('DeathScene'), s.join(','));
  rec('HUD/Chest: brak błędów konsoli', realErrs(page.__errs).length === 0,
    realErrs(page.__errs).slice(0, 4).join(' | '));
  await page.close();
} catch (e) {
  rec('TEST 3 (chest/hud)', false, e.message);
}

// ============ TEST 4: Smoke fix #2 — chest z completedLevel doliczá ranking ============
try {
  const page = await mkPage({ width: 1280, height: 720 }, false);
  await page.goto(`${BASE}/?chest=random&level=3`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await sleep(6000);
  // Wymuś restart ChestSelectScene z completedLevel + levelStartScore (realna ścieżka fix #2).
  const before = await page.evaluate(() => {
    try {
      const all = JSON.parse(localStorage.getItem('game_bestScores') || '{}');
      window.__game.scene.stop('ChestSelectScene');
      window.__game.scene.start('ChestSelectScene', {
        nextScene: 'GameScene', completedLevel: 3, levelStartScore: 0,
        // wymuszona nagroda instant (points_200) — deterministyczny test rankingu
        forceRewards: ['points_200', 'points_200', 'points_200'],
      });
      return Object.values(all).reduce((a, b) => a + (b || 0), 0);
    } catch (e) { return 'ERR:' + e.message; }
  });
  await sleep(2500);
  await page.mouse.click(640, 518); // klik skrzyni
  await sleep(3800);
  await page.mouse.click(640, 640); // KONTYNUUJ → applyAndContinue → recordRun(3,...)
  await sleep(3500);
  const after = await page.evaluate(() => {
    try {
      const all = JSON.parse(localStorage.getItem('game_bestScores') || '{}');
      return Object.values(all).reduce((a, b) => a + (b || 0), 0);
    } catch (e) { return 'ERR:' + e.message; }
  });
  rec('Fix #2: skrzynka z completedLevel doliczyła punkty do bestScores (ranking)',
    typeof after === 'number' && typeof before === 'number' && after > before,
    `ranking przed=${before} po=${after}`);
  rec('Fix #2: brak błędów konsoli przy recordRun ze skrzynki', realErrs(page.__errs).length === 0,
    realErrs(page.__errs).slice(0, 3).join(' | '));
  await page.close();
} catch (e) {
  rec('TEST 4 (fix #2 smoke)', false, e.message);
}

await browser.close();

console.log('\n================ PODSUMOWANIE ================');
const pass = summary.filter((s) => s.ok).length;
console.log(`${pass}/${summary.length} PASS`);
summary.filter((s) => !s.ok).forEach((s) => console.log(`  FAIL: ${s.name} :: ${s.detail}`));
console.log(`\nScreenshoty: ${OUT}/`);
process.exit(summary.every((s) => s.ok) ? 0 : 1);
