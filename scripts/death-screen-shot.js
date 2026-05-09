import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
// Force a death by setting up state then triggering — easier: just preview the asset directly via direct URL.
await page.goto('http://localhost:5173/?desktop=1', { waitUntil: 'networkidle2' });
// Inject HTML overlay with the asset to preview it raw
await page.evaluate(() => {
  const img = document.createElement('img');
  img.src = '/assets/ui/death_screen_bg_v2.webp';
  img.style.cssText = 'position:fixed;top:0;left:0;width:1280px;height:720px;z-index:99999';
  document.body.appendChild(img);
});
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: '/tmp/death_bg_preview.png' });
await browser.close();
console.log('saved');
