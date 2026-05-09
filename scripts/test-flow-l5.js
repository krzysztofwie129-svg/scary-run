import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
const errs = [];
const sceneStarts = [];
page.on('console', (msg) => {
  const t = msg.text();
  if (msg.type() === 'error') errs.push(`[err] ${t}`);
  if (t.includes('[Scene') || t.includes('start') || t.includes('Score')) sceneStarts.push(t);
});
page.on('pageerror', (err) => errs.push(`PAGE ERR: ${err.message}\n${err.stack?.split('\n').slice(0, 5).join('\n')}`));

// Symulujemy wejście do L5 BEZ save state (świeży start, level=4 by code).
// Użyję ?level=5 query param jeśli jest taki — albo seteruję save:
await page.evaluateOnNewDocument(() => {
  try {
    localStorage.setItem('game_wallet', JSON.stringify({coins: 5000, diamonds: 50}));
    localStorage.setItem('scaryrun_owned_skins', JSON.stringify(['default']));
    localStorage.setItem('scaryrun_equipped_skin', JSON.stringify('default'));
    localStorage.setItem('scary_run_save_v1', JSON.stringify({
      session: { players: [{ name: 'TEST', character: 'char01', level: 4, lives: 1, score: 0, coins: 0, diamonds: 0, levelStartSnapshot: { coins: 0, diamonds: 0, score: 0 } }], currentPlayerIndex: 0, numPlayers: 1, isMultiplayer: false },
      currentLevel: 4,
      timestamp: Date.now(),
    }));
  } catch {}
});

await page.goto('http://localhost:5173/?desktop=1', { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 3000));
await page.screenshot({ path: '/tmp/flow_01_menu.png' });

// Click KONTYNUUJ — z save state powinien wskoczyć w L5 (currentLevel=4, 0-based).
await page.mouse.click(640, 367);
await new Promise((r) => setTimeout(r, 4000));
await page.screenshot({ path: '/tmp/flow_02_l5_start.png' });

// Niech minie 30s — level zakończy się.
await new Promise((r) => setTimeout(r, 32000));
await page.screenshot({ path: '/tmp/flow_03_after_finish.png' });

// Czekaj 3s na boss choice scene.
await new Promise((r) => setTimeout(r, 3000));
await page.screenshot({ path: '/tmp/flow_04_boss_choice.png' });

console.log('=== ERRORS ===');
errs.slice(-20).forEach((e) => console.log(e));
console.log('=== SCENE/SCORE LOG ===');
sceneStarts.slice(-15).forEach((s) => console.log(s));

await browser.close();
