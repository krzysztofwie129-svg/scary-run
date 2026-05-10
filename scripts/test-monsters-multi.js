// Multi-screenshot test — co 1.5s zrób shot, na L11 i L21 żeby zobaczyć różne potwory.
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGE: ' + e.message));
page.on('console', (msg) => {
  const t = msg.text();
  if (msg.type() === 'error' && !/char0[567]_|Hit_\d|Failed to process file|api\/stats/i.test(t)) errs.push('[err] ' + t);
});

for (const N of [11, 21]) {
  await page.evaluateOnNewDocument((idx) => {
    localStorage.clear();
    localStorage.setItem('scary_run_player_v1', JSON.stringify({name: 'TESTER'}));
    localStorage.setItem('scary_run_save_v1', JSON.stringify({
      session: { players: [{ name: 'TESTER', character: 'char01', level: idx, lives: 1, score: 0, coins: 0, diamonds: 0, finished: false, levelStartSnapshot: { coins: 0, diamonds: 0, score: 0 }, deathsThisLevel: 0 }], currentPlayerIndex: 0, numPlayers: 1, isMultiplayer: false },
      currentLevel: idx, timestamp: Date.now(),
    }));
  }, N - 1);
  await page.goto('http://localhost:5173/?desktop=1', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 3000));
  await page.mouse.click(640, 367); // KONTYNUUJ
  // Co 1s screenshot przez 8 razy.
  for (let t = 1; t <= 8; t++) {
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: `/tmp/multi_L${N}_t${t}.png` });
  }
  console.log(`L${N} done (8 shots)`);
}

console.log('=== ERRORS ===');
errs.slice(-5).forEach((e) => console.log(' ', e));
await browser.close();
