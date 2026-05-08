// Capture loading at ~95% using window.__progress poll.
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });

// Throttle network so we have time to catch 95%.
const client = await page.target().createCDPSession();
await client.send('Network.enable');
await client.send('Network.emulateNetworkConditions', {
  offline: false,
  latency: 50,
  downloadThroughput: 1024 * 1024, // 1 MB/s
  uploadThroughput: 1024 * 1024,
});
await page.setCacheEnabled(false);

page.goto('http://localhost:4173/?desktop=1').catch(() => {});
await page.waitForSelector('canvas', { timeout: 30000 });

// Poll until progress reaches ~0.95.
let captured = false;
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 100));
  const p = await page.evaluate(() => window.__progress || 0);
  if (p >= 0.92 && p <= 0.97) {
    await page.screenshot({ path: '/tmp/loading-95.png' });
    console.log(`Captured at progress ${p.toFixed(3)}`);
    captured = true;
    break;
  }
  if (p >= 1.0) {
    console.log('Already 100%, missed 95%');
    break;
  }
}
if (!captured) console.log('No 95% frame captured');
await browser.close();
