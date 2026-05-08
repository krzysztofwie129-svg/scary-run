// Quick boss fight screenshot via puppeteer.
// Waits for canvas + 5s after scene start (intro banner + control hints fade).

import puppeteer from 'puppeteer';

const URL = process.argv[2] || 'http://localhost:5174/?boss=1';
const OUT = process.argv[3] || '/tmp/boss-fight.png';

const browser = await puppeteer.launch();
const page = await browser.newPage();

// iPhone landscape — DeviceDetect.isMobileDevice() wymaga maxDim ≤ 1100 + touch.
await page.emulate({
  viewport: {
    width: 932, height: 430,
    deviceScaleFactor: 3,
    isMobile: true, hasTouch: true, isLandscape: true,
  },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
});

await page.goto(URL, { waitUntil: 'networkidle0' });
await page.waitForSelector('canvas', { timeout: 15000 });
// Take BEFORE first boss attack (which triggers camera flash + projectile).
// Intro banner 800-2200ms, fight starts 2200ms, first boss attack 3200ms.
// Sweet spot: 2.7s — intro done, hints visible, no attack yet.
await new Promise((r) => setTimeout(r, 2700));

await page.screenshot({ path: OUT, fullPage: false });
console.log(`Screenshot saved → ${OUT}`);
await browser.close();
