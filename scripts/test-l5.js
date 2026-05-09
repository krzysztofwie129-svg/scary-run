import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
const logs = [];
const errors = [];
page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (err) => errors.push(`PAGE ERR: ${err.message}\n${err.stack}`));
page.on('requestfailed', (req) => errors.push(`REQ FAIL: ${req.url()} ${req.failure()?.errorText}`));

// Skip prosto do L5 przez save state (level=4 = 0-based, czyli L5 1-based).
await page.evaluateOnNewDocument(() => {
  try {
    localStorage.setItem('game_wallet', JSON.stringify({coins: 1000, diamonds: 50}));
    localStorage.setItem('scaryrun_owned_skins', JSON.stringify(['default']));
    localStorage.setItem('scaryrun_equipped_skin', JSON.stringify('default'));
    localStorage.setItem('scary_run_save_v1', JSON.stringify({
      session: { players: [{ name: 'TEST', character: 'char01', level: 4, lives: 1, score: 0, coins: 0, diamonds: 0 }], currentPlayerIndex: 0, numPlayers: 1, isMultiplayer: false },
      currentLevel: 4,
      timestamp: Date.now(),
    }));
  } catch {}
});
await page.goto('http://localhost:5173/?desktop=1', { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 4000));
await page.screenshot({ path: '/tmp/l5_01_menu.png' });
// Click KONTYNUUJ
await page.mouse.click(640, 367);
await new Promise((r) => setTimeout(r, 5000));
await page.screenshot({ path: '/tmp/l5_02_game.png' });

console.log('=== ERRORS ===');
errors.forEach((e) => console.log(e));
console.log('=== WARN/LOG (last 30) ===');
logs.filter(l => l.includes('warn') || l.includes('error') || l.includes('PowerUp') || l.includes('Score')).slice(-30).forEach((l) => console.log(l));

await browser.close();
