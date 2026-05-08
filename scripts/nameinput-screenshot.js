// NameInput screenshot — clear saved name, click GRAJ → NameInputScene.
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
await page.goto('http://localhost:5173/?desktop=1');
await page.evaluate(() => {
  // Clear name + leaderboard so menu shows GRAJ as first item.
  localStorage.removeItem('scary_run_player_name');
  localStorage.removeItem('scary_run_save_v1');
});
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 30000 });
await new Promise((r) => setTimeout(r, 4000));
// First click unlocks audio. Second click triggers GRAJ (no save = items[0]).
// items[0] center y = 290 (3 buttons stack: 290, 395, 500).
await page.mouse.click(640, 290);
await new Promise((r) => setTimeout(r, 500));
await page.mouse.click(640, 290);
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: '/tmp/nameinput.png' });
console.log('Saved /tmp/nameinput.png');
await browser.close();
