// Weryfikacja redesignu zakładki POWER-UPY w sklepie.
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`PAGE ERR: ${e.message}`));
page.on('requestfailed', (r) => {
  if (!r.url().includes('/api/')) errors.push(`REQ FAIL: ${r.url()}`);
});

// Trochę monet, żeby przetestować też stan owned>0.
await page.evaluateOnNewDocument(() => {
  try {
    localStorage.setItem('game_wallet', JSON.stringify({ coins: 500, diamonds: 20 }));
  } catch {}
});

await page.goto('http://localhost:5173/?desktop=1', { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 4500));

// Wejdź wprost do ShopScene przez DEV-exposed game.
const started = await page.evaluate(() => {
  if (window.__game) { window.__game.scene.start('ShopScene', { returnScene: 'MenuScene' }); return true; }
  return false;
});
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: '/tmp/shop_skins.png' });

// Klik zakładkę POWER-UPY (druga zakładka, ~x=790 y=145).
await page.mouse.click(790, 145);
await new Promise((r) => setTimeout(r, 2000));
await page.screenshot({ path: '/tmp/shop_powerups.png' });

// Kup pierwszy power-up (Magnes) — przycisk KUP ~prawa strona pierwszego wiersza.
// Wiersz 1 środek ~y=200+54=254, button KUP ~x=640+338=978.
await page.mouse.click(978, 254);
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: '/tmp/shop_powerups_afterbuy.png' });

await browser.close();
console.log('shop started:', started);
console.log('errors:', errors.length ? errors : 'BRAK');
console.log(errors.length === 0 && started ? 'VERIFY OK' : 'VERIFY FAIL');
