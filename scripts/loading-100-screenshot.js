// Capture loading screen at ~100%. Trick: throttle network via CDP, then
// poll for highest progress reached.
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });

// Throttle network to slow down asset loading.
const client = await page.target().createCDPSession();
await client.send('Network.enable');
await client.send('Network.emulateNetworkConditions', {
  offline: false,
  latency: 100,
  downloadThroughput: 200 * 1024, // 200 KB/s
  uploadThroughput: 200 * 1024,
});

page.goto('http://localhost:4173/?desktop=1').catch(() => {}); // fire and forget
await page.waitForSelector('canvas', { timeout: 30000 });

// Take screenshots every 300ms, save best one near 100%.
let best = 0;
let bestPath = '/tmp/loading-100.png';
for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 300));
  const path = `/tmp/loading-frame-${i}.png`;
  await page.screenshot({ path });
  // Quick OCR via reading binary — too complex. Just save last frame before MenuScene.
  // We'll diff vs MenuScene look later. For now keep all and pick manually.
}
// Take one more after settle.
await new Promise((r) => setTimeout(r, 200));
await page.screenshot({ path: '/tmp/loading-final-frame.png' });
console.log('Saved 30 frames + final');
await browser.close();
