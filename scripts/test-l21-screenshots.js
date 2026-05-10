// Smoke test screenshot — L1, L11, L21, Settings.
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (err) => errors.push(`PAGE: ${err.message}`));
page.on('requestfailed', (req) => {
  const url = req.url();
  if (!url.includes('char05_') && !url.includes('char06_') && !url.includes('char07_') && !url.includes('Hit_')) {
    errors.push(`REQ FAIL: ${url} ${req.failure()?.errorText}`);
  }
});

await page.evaluateOnNewDocument(() => {
  localStorage.setItem('game_wallet', JSON.stringify({coins: 1000, diamonds: 50}));
  localStorage.setItem('scaryrun_owned_skins', JSON.stringify(['default']));
  localStorage.setItem('scaryrun_equipped_skin', JSON.stringify('default'));
  localStorage.setItem('scary_run_player_v1', JSON.stringify({name: 'TESTER'}));
  localStorage.setItem('scary_run_save_v1', JSON.stringify({
    session: { players: [{ name: 'TEST', character: 'char01', level: 0, lives: 1, score: 0, coins: 0, diamonds: 0, levelStartSnapshot: { coins: 0, diamonds: 0, score: 0 } }], currentPlayerIndex: 0, numPlayers: 1, isMultiplayer: false },
    currentLevel: 0,
    timestamp: Date.now(),
  }));
});

const tests = [
  { name: 'menu', url: 'http://localhost:5173/?desktop=1', wait: 3000, file: '/tmp/sm_menu.png' },
  { name: 'L1', url: 'http://localhost:5173/?desktop=1&level=1', wait: 3500, file: '/tmp/sm_l1.png' },
  { name: 'L11', url: 'http://localhost:5173/?desktop=1&level=11', wait: 3500, file: '/tmp/sm_l11.png' },
  { name: 'L21', url: 'http://localhost:5173/?desktop=1&level=21', wait: 3500, file: '/tmp/sm_l21.png' },
];

for (const t of tests) {
  await page.goto(t.url, { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, t.wait));
  await page.screenshot({ path: t.file });
  console.log(`✓ ${t.name} screenshot saved (${t.file})`);
}

// Settings via menu click — wymaga znajomości pozycji zębatki (top-right circle 28r at GAME_WIDTH-50, 50)
// Canvas viewport 1280x720, click na top-right zębatka.
await page.goto('http://localhost:5173/?desktop=1', { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 3000));
// Canvas Phaser scaluje fit — w viewport 1280x720 gra rendderuje 1:1, więc gear jest w pikselach przeglądarki ~1230x50.
// Z safe area shifts na MacOS chrome top bar... try direct canvas coords via game.scale
const gearClicked = await page.evaluate(() => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return false;
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / 1280;
  const scaleY = rect.height / 720;
  const x = rect.left + (1280 - 50) * scaleX;
  const y = rect.top + 50 * scaleY;
  const ev = new PointerEvent('pointerup', { clientX: x, clientY: y, bubbles: true });
  canvas.dispatchEvent(ev);
  return true;
});
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: '/tmp/sm_settings.png' });
console.log('✓ settings screenshot saved (/tmp/sm_settings.png)');

console.log();
console.log('=== ERRORS (filtered) ===');
errors.slice(-10).forEach((e) => console.log(e));

await browser.close();
