import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  try {
    localStorage.setItem('scary_run_save_v1', JSON.stringify({
      session: { players: [{ name: 'TEST', character: 'char01', level: 0, lives: 1, score: 0, coins: 86, diamonds: 3 }], currentPlayerIndex: 0, numPlayers: 1, isMultiplayer: false },
      currentLevel: 0,
      timestamp: Date.now(),
    }));
  } catch {}
});
await page.goto('http://localhost:5173/?desktop=1&level=1', { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 4000));
// Click GRAJ if at menu
const buttons = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('canvas')).length;
});
console.log('canvas:', buttons);
await page.screenshot({ path: '/tmp/game_initial.png' });
// Click KONTYNUUJ button (first in stack at y=300)
await page.mouse.click(640, 300);
await new Promise((r) => setTimeout(r, 4000));
await page.screenshot({ path: '/tmp/game_after_click.png' });
await browser.close();
console.log('saved');
