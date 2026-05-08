// NameInput MP screenshot — start NameInputScene z numPlayers=2 directly.
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
await page.goto('http://localhost:5173/?desktop=1');
await page.evaluate(() => {
  localStorage.removeItem('scary_run_player_name');
});
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 30000 });
await new Promise((r) => setTimeout(r, 4000));
// Click MULTI (no save → items[1] at y=395), then 2 PLAYERS (y ~280).
await page.mouse.click(640, 395);
await new Promise((r) => setTimeout(r, 500));
await page.mouse.click(640, 395);
await new Promise((r) => setTimeout(r, 1500));
// Now in mp_count screen → click 2 PLAYERS (cy-70+30 = 290 - 70 + 30 = 250 idx 0)
// cy = GAME_HEIGHT/2 - 70 = 290. idx 0 (2 PLAYERS) at cy+30 = 320.
await page.mouse.click(640, 320);
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: '/tmp/nameinput-mp.png' });
console.log('Saved /tmp/nameinput-mp.png');
await browser.close();
