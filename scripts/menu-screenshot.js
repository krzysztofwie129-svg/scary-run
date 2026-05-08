// MenuScene screenshot — dev/?desktop=1 → wait for menu_bg load → snap.
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
await page.goto('http://localhost:5173/?desktop=1');
await page.waitForSelector('canvas', { timeout: 10000 });
// Wait for assets to load + MenuScene create.
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: '/tmp/menu-new.png' });
console.log('Saved /tmp/menu-new.png');
await browser.close();
