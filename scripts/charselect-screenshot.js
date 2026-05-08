// CharSelect screenshot — inject name + click GRAJ.
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
await page.goto('http://localhost:5173/?desktop=1');
await page.evaluate(() => {
  localStorage.setItem('scary_run_player_v1', JSON.stringify({ name: 'TEST', savedAt: Date.now() }));
  localStorage.removeItem('scary_run_save_v1');
});
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 30000 });
await new Promise((r) => setTimeout(r, 4000));
// GRAJ button (no save → items[0] at y=290). Single click — audio unlock
// + button trigger fire together (Phaser scene-level pointerdown nie blokuje
// game-object pointerup).
await page.mouse.click(640, 290);
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: '/tmp/charselect.png' });
console.log('Saved /tmp/charselect.png');
await browser.close();
