import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGE: ' + e.message));
page.on('console', (msg) => { if (msg.type() === 'error' && !/char0[567]_|Hit_\d|Failed to process|api\/stats/i.test(msg.text())) errs.push('[err] ' + msg.text()); });

await page.evaluateOnNewDocument(() => {
  localStorage.setItem('scary_run_player_v1', JSON.stringify({name: 'TESTER'}));
  localStorage.setItem('scary_run_save_v1', JSON.stringify({
    session: { players: [{ name: 'TESTER', character: 'char01', level: 6, lives: 1, score: 0, coins: 0, diamonds: 0, finished: false, levelStartSnapshot: { coins: 0, diamonds: 0, score: 0 }, deathsThisLevel: 0 }], currentPlayerIndex: 0, numPlayers: 1, isMultiplayer: false },
    currentLevel: 6, timestamp: Date.now(),
  }));
});
await page.goto('http://localhost:5173/?desktop=1', { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 3000));
await page.mouse.click(640, 367);
for (let t = 1; t <= 6; t++) {
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: `/tmp/L7_t${t}.png` });
}
console.log('=== ERRORS ===');
errs.slice(-5).forEach((e) => console.log(' ', e));
await browser.close();
