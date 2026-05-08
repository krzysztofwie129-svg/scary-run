import puppeteer from 'puppeteer';
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
await page.goto('http://localhost:5173/?desktop=1');
await page.waitForSelector('canvas', { timeout: 10000 });
// PreloadScene now holds 1.5s after complete. Wait 2.5s to capture at 100%.
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: '/tmp/loading-100.png' });
console.log('Saved /tmp/loading-100.png');
await browser.close();
