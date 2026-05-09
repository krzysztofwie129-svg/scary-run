import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  // Pre-set wallet so we have data
  try {
    localStorage.setItem('game_wallet', JSON.stringify({coins: 500, diamonds: 50}));
    localStorage.setItem('scaryrun_owned_skins', JSON.stringify(['default','vampire']));
    localStorage.setItem('scaryrun_equipped_skin', 'vampire');
  } catch {}
});
await page.goto('http://localhost:5173/?desktop=1', { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 5000));
await page.screenshot({ path: '/tmp/shop_main.png' });
// Click shop button
await page.mouse.click(150, 175);
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: '/tmp/shop_open.png' });
// Click POWER-UPY tab
await page.mouse.click(820, 145);
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: '/tmp/shop_powerups.png' });
await browser.close();
console.log('saved');
