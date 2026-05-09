import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
const logs = [];
page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
await page.evaluateOnNewDocument(() => {
  try {
    localStorage.setItem('game_wallet', JSON.stringify({coins: 1000, diamonds: 50}));
    localStorage.setItem('scaryrun_owned_powerups', JSON.stringify({magnet: 1, shield: 0, turbo: 0, double_coins: 0}));
    localStorage.setItem('scaryrun_active_powerup', JSON.stringify('magnet'));
    localStorage.setItem('scaryrun_owned_skins', JSON.stringify(['default']));
    localStorage.setItem('scaryrun_equipped_skin', JSON.stringify('default'));
    // Save state for KONTYNUUJ
    localStorage.setItem('scary_run_save_v1', JSON.stringify({
      session: { players: [{ name: 'TEST', character: 'char01', level: 0, lives: 1, score: 0, coins: 0, diamonds: 0 }], currentPlayerIndex: 0, numPlayers: 1, isMultiplayer: false },
      currentLevel: 0,
      timestamp: Date.now(),
    }));
  } catch {}
});
await page.goto('http://localhost:5173/?desktop=1&level=1', { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 4000));
await page.screenshot({ path: '/tmp/pu_01_menu.png' });
// Click KONTYNUUJ — y=367 (z 2 buttonami, hasSave layout)
await page.mouse.click(640, 367);
await new Promise((r) => setTimeout(r, 4000));
await page.screenshot({ path: '/tmp/pu_02_after_kontynuuj.png' });

console.log('=== ALL LOG/WARNING ===');
logs.filter(l => !l.includes('error')).slice(-50).forEach((l) => console.log(l));
console.log('=== check active powerup state in localStorage ===');
const state = await page.evaluate(() => ({
  active: localStorage.getItem('scaryrun_active_powerup'),
  owned: localStorage.getItem('scaryrun_owned_powerups'),
}));
console.log(state);

await browser.close();
