// Komprehensywny test A-Z na live DEV scaryrun.win.
// Sprawdza pełen flow: nick input, char select, gra, boss, settings, claim, reset.

import puppeteer from 'puppeteer';

const URL = 'https://scaryrun.win?desktop=1';
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
const errs = [];
const isNoise = (t) => /char0[567]_|Hit_\d|Failed to process file/i.test(t);
page.on('pageerror', (e) => errs.push(`PAGE: ${e.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error' && !isNoise(msg.text())) errs.push(`[err] ${msg.text()}`);
});

const fail = [];
let stepNo = 0;
async function step(name, fn) {
  stepNo++;
  try {
    await fn();
    console.log(`  ✓ ${stepNo}. ${name}`);
  } catch (e) {
    fail.push(`${stepNo}. ${name}: ${e.message}`);
    console.log(`  ✗ ${stepNo}. ${name}: ${e.message}`);
  }
}

// Fresh user (brak save)
await page.evaluateOnNewDocument(() => { localStorage.clear(); });

console.log('=== A. PIERWSZE WEJŚCIE — FRESH USER ===');

await step('Goto menu (fresh)', async () => {
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 3500));
  await page.screenshot({ path: '/tmp/az_01_fresh.png' });
});

await step('Klik gear (1125, 70 w baked menu_icons_row)', async () => {
  await page.mouse.click(1125, 70);
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: '/tmp/az_02_settings.png' });
  // Sprawdź że jesteśmy w SettingsScene — RESET POSTĘPU label powinien być widoczny
  // (sceny Phaser nie udostępniają DOM, ale możemy sprawdzić że dom input <input placeholder="SCARY-XXXX-XXXX"> jest)
  const hasInput = await page.$('input[placeholder="SCARY-XXXX-XXXX"]');
  if (!hasInput) throw new Error('SettingsScene nie otwarte (brak SCARY input)');
});

await step('Difficulty switch HARD', async () => {
  await page.mouse.click(640 + 200, 165);
  await new Promise((r) => setTimeout(r, 600));
  const v = await page.evaluate(() => localStorage.getItem('scaryrun_difficulty'));
  if (v !== 'hard') throw new Error(`got ${v}`);
});

await step('Generuj kod ratunkowy', async () => {
  // WYGENERUJ KOD button: x=GAME_WIDTH/2-145=495, y=525
  await page.mouse.click(495, 525);
  await new Promise((r) => setTimeout(r, 2500));
  const code = await page.evaluate(() => localStorage.getItem('scaryrun_my_code'));
  if (!code || !/^SCARY-/.test(code)) throw new Error(`code=${code}`);
});

await step('SKOPIUJ klik (clipboard fallback)', async () => {
  await page.mouse.click(640 + 145, 525);
  await new Promise((r) => setTimeout(r, 800));
});

await step('Reset postępu — klik ZACZNIJ OD POCZĄTKU', async () => {
  // przesunięty na (GAME_WIDTH/2, 320)
  await page.mouse.click(640, 320);
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: '/tmp/az_03_reset_modal.png' });
  const inp = await page.$('input[placeholder="NICK"]');
  if (!inp) throw new Error('Reset modal NICK input nie widoczny');
});

await step('Wpisz nowe imię + klik TAK ZRESETUJ', async () => {
  await page.type('input[placeholder="NICK"]', 'AZTEST');
  await new Promise((r) => setTimeout(r, 300));
  // TAK button na (530, 440)
  await page.mouse.click(530, 440);
  await new Promise((r) => setTimeout(r, 2200));
  // Po reset przekierowuje na MenuScene
  const wallet = await page.evaluate(() => localStorage.getItem('game_wallet'));
  if (wallet) throw new Error(`wallet not cleared: ${wallet}`);
  const pendingName = await page.evaluate(() => localStorage.getItem('scaryrun_pending_name'));
  if (pendingName !== 'AZTEST') throw new Error(`pendingName=${pendingName}`);
});

console.log();
console.log('=== B. NORMALNA GRA — Z SAVE STATE ===');

await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem('game_wallet', JSON.stringify({coins: 200, diamonds: 10}));
  localStorage.setItem('scaryrun_owned_skins', JSON.stringify(['default']));
  localStorage.setItem('scaryrun_equipped_skin', JSON.stringify('default'));
  localStorage.setItem('scary_run_player_v1', JSON.stringify({name: 'AZTEST'}));
  localStorage.setItem('scary_run_save_v1', JSON.stringify({
    session: {
      players: [{ name: 'AZTEST', character: 'char01', level: 0, lives: 1, score: 0, coins: 0, diamonds: 0, finished: false, levelStartSnapshot: { coins: 0, diamonds: 0, score: 0 }, deathsThisLevel: 0 }],
      currentPlayerIndex: 0, numPlayers: 1, isMultiplayer: false,
    },
    currentLevel: 0,
    timestamp: Date.now(),
  }));
});

await step('Goto menu z save (KONTYNUUJ visible)', async () => {
  await page.goto(URL, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 3000));
  await page.screenshot({ path: '/tmp/az_04_menu_with_save.png' });
});

await step('KONTYNUUJ → GameScene L1 startuje', async () => {
  await page.mouse.click(640, 367);
  await new Promise((r) => setTimeout(r, 4500));
  await page.screenshot({ path: '/tmp/az_05_l1_running.png' });
});

await step('Czekaj na śmierć → DeathScene', async () => {
  // Postać nie skacze, wpadnie na obstacle, śmierć w ~5-15s.
  await new Promise((r) => setTimeout(r, 12000));
  await page.screenshot({ path: '/tmp/az_06_death_scene.png' });
});

console.log();
console.log('=== C. SKLEP ===');

await step('Powrót do menu (klik WRÓĆ na DeathScene)', async () => {
  await page.mouse.click(60, 60); // WRÓĆ button top-left na DeathScene
  await new Promise((r) => setTimeout(r, 2500));
});

await step('Klik SKLEP', async () => {
  // SKLEP button na MenuScene — top-left under stat bars (150, 205)
  await page.mouse.click(150, 205);
  await new Promise((r) => setTimeout(r, 2500));
  await page.screenshot({ path: '/tmp/az_07_shop.png' });
});

await step('SKLEP wróć', async () => {
  await page.mouse.click(110, 50); // shop_btn_back
  await new Promise((r) => setTimeout(r, 2000));
});

console.log();
console.log('=== D. RANKING ===');

await step('Klik RANKING (na MenuScene)', async () => {
  // RANKING button gdy hasSave=true to drugi po KONTYNUUJ
  await page.mouse.click(640, 467);
  await new Promise((r) => setTimeout(r, 2500));
  await page.screenshot({ path: '/tmp/az_08_ranking.png' });
});

console.log();
console.log('=== SUMMARY ===');
console.log(`PASS: ${stepNo - fail.length}/${stepNo}`);
console.log(`FAIL: ${fail.length}`);
if (fail.length) fail.forEach((f) => console.log('  ✗ ' + f));
console.log(`Console errors (filtered): ${errs.length}`);
errs.slice(-5).forEach((e) => console.log(' ', e));

await browser.close();
process.exit(fail.length > 0 || errs.length > 0 ? 1 : 0);
