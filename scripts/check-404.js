import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
const failed = [];
page.on('response', async (res) => {
  if (res.status() === 404) {
    const u = res.url();
    if (!/char0[567]_|Hit_\d/.test(u) && !/api\//.test(u)) failed.push(`404 ${u}`);
  }
});
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('scary_run_player_v1', JSON.stringify({name: 'T'}));
});
await page.goto('http://localhost:5173/?desktop=1', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise((r) => setTimeout(r, 5000));
console.log('=== 404 ===');
[...new Set(failed)].forEach((f) => console.log(f));
await browser.close();
