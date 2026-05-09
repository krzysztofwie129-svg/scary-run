import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
await page.goto('http://localhost:5173/?desktop=1', { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 4000));
await page.screenshot({ path: '/tmp/menu_after.png' });
await browser.close();
console.log('saved');
