// Test reset gry przez modal Settings → ZACZNIJ OD POCZĄTKU.
// Verify: modal pokazuje się, input działa, reset czyści localStorage poza
// deviceId/code/difficulty, menu po reset → GRAJ (hasSave=false).

import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();

const errs = [];
page.on('pageerror', (e) => errs.push(`PAGE: ${e.message}`));
page.on('console', (msg) => {
  const t = msg.text();
  if (msg.type() === 'error' && !/char0[567]_|Hit_\d|Failed to process file/i.test(t)) {
    errs.push(`[err] ${t}`);
  }
});

// Setup: save state (gracz w trakcie gry, monety, skiny, claim code, difficulty)
await page.evaluateOnNewDocument(() => {
  localStorage.clear();
  localStorage.setItem('scary_run_device_id_v1', 'test-reset-device-12345');
  localStorage.setItem('scaryrun_my_code', 'SCARY-ABCD-2345');
  localStorage.setItem('scaryrun_difficulty', 'hard');
  localStorage.setItem('game_wallet', JSON.stringify({coins: 1500, diamonds: 30}));
  localStorage.setItem('game_bestScores', JSON.stringify({1: 500, 2: 1000, 3: 1500}));
  localStorage.setItem('scaryrun_owned_skins', JSON.stringify(['default', 'vampire']));
  localStorage.setItem('scaryrun_equipped_skin', JSON.stringify('vampire'));
  localStorage.setItem('scaryrun_owned_powerups', JSON.stringify({magnet: 2, shield: 1}));
  localStorage.setItem('scary_run_player_v1', JSON.stringify({name: 'OLDNAME'}));
  localStorage.setItem('scary_run_save_v1', JSON.stringify({
    session: {
      players: [{ name: 'OLDNAME', character: 'char01', level: 5, lives: 1, score: 200, coins: 50, diamonds: 5, finished: false, levelStartSnapshot: { coins: 0, diamonds: 0, score: 0 }, deathsThisLevel: 0 }],
      currentPlayerIndex: 0, numPlayers: 1, isMultiplayer: false,
    },
    currentLevel: 5,
    timestamp: Date.now(),
  }));
});

console.log('--- 1. Open menu (save state present) ---');
await page.goto('http://localhost:5173/?desktop=1', { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 3000));

const before = await page.evaluate(() => ({
  wallet: localStorage.getItem('game_wallet'),
  bestScores: localStorage.getItem('game_bestScores'),
  skins: localStorage.getItem('scaryrun_owned_skins'),
  save: !!localStorage.getItem('scary_run_save_v1'),
  deviceId: localStorage.getItem('scary_run_device_id_v1'),
  code: localStorage.getItem('scaryrun_my_code'),
  difficulty: localStorage.getItem('scaryrun_difficulty'),
  playerName: localStorage.getItem('scary_run_player_v1'),
}));
console.log('  before reset:');
console.log('    wallet =', before.wallet);
console.log('    bestScores =', before.bestScores);
console.log('    save? =', before.save);
console.log('    deviceId =', before.deviceId);
console.log('    code =', before.code);
console.log('    difficulty =', before.difficulty);

console.log('--- 2. Click gear (top-right) ---');
await page.mouse.click(1230, 50);
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: '/tmp/reset_01_settings.png' });

console.log('--- 3. Click ZACZNIJ OD POCZĄTKU (y=660) ---');
await page.mouse.click(640, 660);
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: '/tmp/reset_02_modal.png' });

console.log('--- 4. Wpisuję nick w DOM input ---');
const inputSel = 'input[placeholder="NICK"]';
const inputExists = await page.$(inputSel);
console.log('  input exists?', !!inputExists);
if (inputExists) {
  await page.type(inputSel, 'NEWNAME');
  await new Promise((r) => setTimeout(r, 300));
  const inputVal = await page.$eval(inputSel, (el) => el.value);
  console.log('  input value:', inputVal);
}

console.log('--- 5. Click TAK ZRESETUJ ---');
// Modal: TAK button na (GAME_WIDTH/2 - 110, GAME_HEIGHT/2 + 80) = (530, 440).
await page.mouse.click(530, 440);
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: '/tmp/reset_03_after.png' });

const after = await page.evaluate(() => ({
  wallet: localStorage.getItem('game_wallet'),
  bestScores: localStorage.getItem('game_bestScores'),
  skins: localStorage.getItem('scaryrun_owned_skins'),
  save: !!localStorage.getItem('scary_run_save_v1'),
  deviceId: localStorage.getItem('scary_run_device_id_v1'),
  code: localStorage.getItem('scaryrun_my_code'),
  difficulty: localStorage.getItem('scaryrun_difficulty'),
  playerName: localStorage.getItem('scary_run_player_v1'),
  pendingName: localStorage.getItem('scaryrun_pending_name'),
}));
console.log('  after reset:');
console.log('    wallet =', after.wallet, '(expected: null lub {coins:0,diamonds:0})');
console.log('    bestScores =', after.bestScores, '(expected: null)');
console.log('    skins =', after.skins, '(expected: null)');
console.log('    save? =', after.save, '(expected: false)');
console.log('    deviceId =', after.deviceId, '(expected: zachowane test-reset-device-12345)');
console.log('    code =', after.code, '(expected: zachowane SCARY-ABCD-2345)');
console.log('    difficulty =', after.difficulty, '(expected: zachowane hard)');
console.log('    playerName =', after.playerName, '(expected: null — PlayerStore.clear)');
console.log('    pendingName =', after.pendingName, '(expected: NEWNAME)');

// Verify expectations
const checks = [
  { name: 'wallet cleared', pass: !after.wallet || after.wallet === '{"coins":0,"diamonds":0}' },
  { name: 'bestScores cleared', pass: !after.bestScores },
  { name: 'skins cleared', pass: !after.skins },
  { name: 'save cleared', pass: !after.save },
  { name: 'deviceId zachowane', pass: after.deviceId === 'test-reset-device-12345' },
  { name: 'code zachowane', pass: after.code === 'SCARY-ABCD-2345' },
  { name: 'difficulty zachowane', pass: after.difficulty === 'hard' },
  { name: 'playerName cleared', pass: !after.playerName },
  { name: 'pendingName=NEWNAME', pass: after.pendingName === 'NEWNAME' },
];

console.log();
console.log('=== CHECKS ===');
let failed = 0;
for (const c of checks) {
  console.log(`  ${c.pass ? '✓' : '✗'} ${c.name}`);
  if (!c.pass) failed++;
}

console.log();
console.log('=== ERRORS ===');
errs.slice(-5).forEach((e) => console.log(' ', e));

await browser.close();
process.exit(failed > 0 || errs.length > 0 ? 1 : 0);
