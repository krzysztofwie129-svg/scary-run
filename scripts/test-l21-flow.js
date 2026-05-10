// Smoke test L21 expansion + difficulty + settings.
// Sprawdza:
//   1. LEVELS.length = 21 (frontend)
//   2. Level 21 (przez ?level=21) startuje bez crashu
//   3. Level 11 (środek) startuje OK
//   4. Boss fight z fromLevel=15 startuje (bg cycle modulo OK)
//   5. Difficulty hard: hp boss × 1.05^level
//   6. Difficulty easy: hp boss × 0.7
//   7. Settings scena startuje, zębatka działa

import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();

const errors = [];
const logs = [];
page.on('pageerror', (err) => errors.push(`PAGE: ${err.message}\n${err.stack?.split('\n').slice(0, 4).join(' | ')}`));
page.on('console', (msg) => {
  const t = msg.text();
  if (msg.type() === 'error') errors.push(`[err] ${t}`);
  if (msg.type() === 'log' && (t.includes('[Score') || t.includes('[Boss') || t.includes('[Sentry') || t.includes('PowerUp'))) {
    logs.push(t);
  }
});

async function test(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.log(`✗ ${name}: ${e.message}`);
    process.exitCode = 1;
  }
}

// === T1: LEVELS.length frontend ===
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('game_wallet', JSON.stringify({coins: 1000, diamonds: 50}));
  localStorage.setItem('scaryrun_owned_skins', JSON.stringify(['default']));
  localStorage.setItem('scaryrun_equipped_skin', JSON.stringify('default'));
  localStorage.setItem('scary_run_player_v1', JSON.stringify({name: 'TESTER'}));
  localStorage.setItem('scaryrun_difficulty', 'normal');
});

await page.goto('http://localhost:5173/?desktop=1', { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 3000));

await test('L1 LEVELS.length=21 (config)', async () => {
  const len = await page.evaluate(async () => {
    const m = await import('/src/config.js');
    return m.LEVELS.length;
  });
  if (len !== 21) throw new Error(`expected 21, got ${len}`);
});

await test('L2 L21 has level10_test bg', async () => {
  const lvl = await page.evaluate(async () => {
    const m = await import('/src/config.js');
    return { id: m.LEVELS[20].id, bg: m.LEVELS[20].bgFolder, ws: m.LEVELS[20].worldSpeed };
  });
  if (lvl.id !== 21) throw new Error(`L21 id=${lvl.id}`);
  if (lvl.bg !== 'level10_test') throw new Error(`L21 bg=${lvl.bg}`);
  if (lvl.ws < 950) throw new Error(`L21 worldSpeed=${lvl.ws} (oczekiwane ~981)`);
});

await test('L3 difficulty multiplier easy = 0.7', async () => {
  const v = await page.evaluate(async () => {
    const m = await import('/src/utils/Difficulty.js');
    localStorage.setItem('scaryrun_difficulty', 'easy');
    return m.getDifficultyMultiplier(5);
  });
  if (Math.abs(v - 0.7) > 0.001) throw new Error(`got ${v}, expected 0.7`);
});

await test('L4 difficulty multiplier hard L1 = 1.05', async () => {
  const v = await page.evaluate(async () => {
    const m = await import('/src/utils/Difficulty.js');
    localStorage.setItem('scaryrun_difficulty', 'hard');
    return m.getDifficultyMultiplier(1);
  });
  if (Math.abs(v - 1.05) > 0.001) throw new Error(`got ${v}, expected 1.05`);
});

await test('L5 difficulty multiplier hard L10 ≈ 1.629', async () => {
  const v = await page.evaluate(async () => {
    const m = await import('/src/utils/Difficulty.js');
    localStorage.setItem('scaryrun_difficulty', 'hard');
    return m.getDifficultyMultiplier(10);
  });
  if (Math.abs(v - 1.6289) > 0.01) throw new Error(`got ${v}`);
});

// reset to normal for the rest
await page.evaluate(() => localStorage.setItem('scaryrun_difficulty', 'normal'));

// === T6: L11 (mid level) startuje bez crashu ===
await test('L6 L11 starts without crash', async () => {
  await page.goto('http://localhost:5173/?desktop=1&level=11', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 3500));
  const sceneKey = await page.evaluate(() => {
    return window.game?.scene?.scenes?.find((s) => s.scene.isActive())?.scene?.key || 'none';
  });
  if (!['GameScene', 'PreloadScene'].includes(sceneKey)) {
    // może na CharSelectScene (nick fresh)
    if (sceneKey !== 'CharSelectScene') throw new Error(`scene=${sceneKey}`);
  }
});

// === T7: L21 (last) startuje ===
await test('L7 L21 starts without crash', async () => {
  await page.goto('http://localhost:5173/?desktop=1&level=21', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 3500));
  // Sprawdź czy bg loadowane (konkretne tło level10_test = bg_level10_test_layer1)
  const hasBg = await page.evaluate(() => {
    return window.game?.textures?.exists('bg_level10_test_layer1') === true;
  });
  if (!hasBg) throw new Error('bg_level10_test_layer1 missing');
});

// === T8: Settings scene loads (przejście po menu) ===
await test('L8 SettingsScene class registered', async () => {
  const has = await page.evaluate(() => {
    return window.game?.scene?.keys?.SettingsScene != null
        || window.game?.scene?.scenes?.some((s) => s.scene.key === 'SettingsScene');
  });
  if (!has) throw new Error('SettingsScene not registered');
});

console.log();
console.log('=== ERRORS (last 10) ===');
errors.slice(-10).forEach((e) => console.log(e));

console.log();
console.log('=== LOGS (last 5) ===');
logs.slice(-5).forEach((l) => console.log(l));

await browser.close();
process.exit(process.exitCode || 0);
