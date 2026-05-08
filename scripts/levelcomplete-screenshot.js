// LevelComplete screenshot — ?levelcomplete=N URL param skips to scene.
import puppeteer from 'puppeteer';
const lvl = process.argv[2] || '1';
const browser = await puppeteer.launch();
const page = await browser.newPage();
page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));
page.on('console', (msg) => { if (msg.type() === 'error') console.log('CONSOLE.error:', msg.text()); });
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
await page.goto(`http://localhost:5173/?desktop=1&levelcomplete=${lvl}`);
await page.waitForSelector('canvas', { timeout: 30000 });
// Wait for full sequence (achievements at 3000ms + 500ms slack).
await new Promise((r) => setTimeout(r, 6500));
await page.screenshot({ path: '/tmp/levelcomplete.png' });
console.log(`Saved /tmp/levelcomplete.png (level ${lvl})`);
await browser.close();
