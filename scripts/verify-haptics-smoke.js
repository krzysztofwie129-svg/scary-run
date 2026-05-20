// Smoke — globalny haptic hook w main.js nie wywala boot; menu + kliki działają.
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`PAGE ERR: ${e.message}`));
page.on('requestfailed', (r) => {
  const u = r.url();
  if (!u.includes('/api/')) errors.push(`REQ FAIL: ${u}`);
});

await page.goto('http://localhost:5173/?desktop=1', { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 4500));
const hasCanvas = await page.evaluate(() => !!document.querySelector('canvas'));
await page.screenshot({ path: '/tmp/haptic_menu.png' });

// Klik w menu (KONTYNUUJ / GRAJ area) — global gameobjectdown hook musi
// odpalić bez błędu.
await page.mouse.click(640, 367);
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: '/tmp/haptic_afterclick.png' });

await browser.close();
console.log('canvas present:', hasCanvas);
console.log('errors:', errors.length ? errors : 'BRAK');
console.log(errors.length === 0 && hasCanvas ? 'SMOKE PASS' : 'SMOKE FAIL');
