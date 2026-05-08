// Test PROD scaryrun.win z debug overlay — flow ?levelcomplete=1 → NEXT → chest → KONTYNUUJ
import puppeteer from 'puppeteer';

const URL = 'https://scaryrun.win/?levelcomplete=1&desktop=1';

const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
const events = [];

page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') events.push(`[${msg.type()}] ${msg.text()}`);
});
page.on('pageerror', (err) => events.push(`[pageerror] ${err.message}`));

await page.goto(URL, { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 5000));
await page.screenshot({ path: '/tmp/overlay_01_lc.png' });

await page.mouse.click(640, 655);
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: '/tmp/overlay_02_chest.png' });

await page.mouse.click(640, 360);
await new Promise((r) => setTimeout(r, 5000));

await page.mouse.click(640, 640);
await new Promise((r) => setTimeout(r, 4000));
await page.screenshot({ path: '/tmp/overlay_03_after_kontynuuj.png' });

const overlayText = await page.evaluate(() => document.getElementById('debug-scene-log')?.textContent || 'no overlay');
console.log('=== Overlay log ===');
console.log(overlayText);
console.log('\n=== Errors ===');
for (const e of events) console.log(e);

await browser.close();
