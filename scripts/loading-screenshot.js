// Loading screen screenshot — capture during PreloadScene (before MenuScene).
import puppeteer from 'puppeteer';

const URL = 'http://localhost:5173/?desktop=1';
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
await page.goto(URL);
// Capture immediately while loading. Wait for canvas but not for networkidle.
await page.waitForSelector('canvas', { timeout: 5000 });
await new Promise((r) => setTimeout(r, 500)); // mid-load
await page.screenshot({ path: '/tmp/loading.png' });
console.log('Saved /tmp/loading.png');
await browser.close();
