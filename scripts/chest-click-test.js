// Click test: tap chest 1 at game world (320, 518) → check what happens.
import puppeteer from 'puppeteer';

const URL = 'http://localhost:4173/?desktop=1&chest=random';
const browser = await puppeteer.launch();
const page = await browser.newPage();

// Test desktop (no touch).
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });

// Capture console logs.
page.on('console', (msg) => console.log('[browser]', msg.type(), msg.text()));
page.on('pageerror', (err) => console.log('[error]', err.message));

await page.goto(URL, { waitUntil: 'networkidle0' });
await page.waitForSelector('canvas', { timeout: 10000 });
await new Promise((r) => setTimeout(r, 1500));

// Desktop: viewport == game size (1280×720), 1:1 mapping.
const screenX = 320;
const screenY = 518;

console.log(`Mouse click at (${screenX}, ${screenY})`);
await page.mouse.click(screenX, screenY);
// Wait for full animation: shake 600ms + flash + reveal 600ms + button delay 1500ms.
await new Promise((r) => setTimeout(r, 3500));

await page.screenshot({ path: '/tmp/chest-after-click.png', fullPage: false });
console.log('Saved /tmp/chest-after-click.png');
await browser.close();
