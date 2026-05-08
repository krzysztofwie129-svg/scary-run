// OrientationLockScene screenshot — emulate mobile portrait → expect lock screen.
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch();
const page = await browser.newPage();
// iPhone 12 portrait viewport.
await page.setViewport({ width: 414, height: 896, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');
await page.goto('http://localhost:5173/');
await page.waitForSelector('canvas', { timeout: 10000 });
await new Promise((r) => setTimeout(r, 3000));
await page.screenshot({ path: '/tmp/orientation-lock.png' });
console.log('Saved /tmp/orientation-lock.png');
await browser.close();
