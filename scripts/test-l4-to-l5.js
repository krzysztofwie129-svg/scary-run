import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
const errs = [];
page.on('console', (msg) => { if (msg.type() === 'error') errs.push(`[err] ${msg.text()}`); });
page.on('pageerror', (err) => errs.push(`PAGE ERR: ${err.message}\n${err.stack?.split('\n').slice(0, 8).join('\n')}`));

// Symulujemy: gracz ukończył L4, jest po boss choice → przed L5.
// Ustawiam save z player.level=3 (L4 ukończony, KONTYNUUJ → wstanowi L4 albo L5?)
// Sesja DangerWindow Fix: handleFinishLineCrossed zapisuje save z level+1.
// Czyli po L4 zapis = level=4 (L5 1-based). Continue → start GameScene z currentLevel=4 → ładuje L5.
await page.evaluateOnNewDocument(() => {
  try {
    localStorage.setItem('game_wallet', JSON.stringify({coins: 1000, diamonds: 50}));
    localStorage.setItem('scaryrun_owned_skins', JSON.stringify(['default']));
    localStorage.setItem('scaryrun_equipped_skin', JSON.stringify('default'));
    // L4 just-finished state: player.level=3 (L4 1-based) — symulujemy to.
    localStorage.setItem('scary_run_save_v1', JSON.stringify({
      session: { players: [{ name: 'TEST', character: 'char01', level: 3, lives: 1, score: 100, coins: 0, diamonds: 0, levelStartSnapshot: { coins: 0, diamonds: 0, score: 0 } }], currentPlayerIndex: 0, numPlayers: 1, isMultiplayer: false },
      currentLevel: 3,
      timestamp: Date.now(),
    }));
  } catch {}
});
await page.goto('http://localhost:5173/?desktop=1', { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 3000));
await page.screenshot({ path: '/tmp/l45_01_menu.png' });
await page.mouse.click(640, 367); // KONTYNUUJ
await new Promise((r) => setTimeout(r, 4000));
await page.screenshot({ path: '/tmp/l45_02_game_l4.png' });

// Żeby przyspieszyć — wyłącz player update timer? Łatwiej: niech postać upadnie (nie skacze) i zginie.
// Wait until death + DeathScene.
await new Promise((r) => setTimeout(r, 8000));
await page.screenshot({ path: '/tmp/l45_03_death.png' });

console.log('=== ERRORS ===');
errs.slice(-15).forEach((e) => console.log(e));

await browser.close();
