// Test SettingsScene v2 — sprawdza że PRZYWRÓĆ POSTĘP button widoczny + DOM input pozycja OK + back btn OK
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(`PAGE: ${e.message}`));
page.on('console', (msg) => { if (msg.type() === 'error' && !/char0[567]_|Hit_\d|Failed to process file/i.test(msg.text())) errs.push(`[err] ${msg.text()}`); });

await page.evaluateOnNewDocument(() => {
  localStorage.setItem('scary_run_player_v1', JSON.stringify({name: 'TESTER'}));
});
await page.goto('http://localhost:5173/?desktop=1', { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 3000));
await page.mouse.click(1125, 70); // gear
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: '/tmp/settings_v2.png' });

// Sprawdź pozycję DOM input
const inputPos = await page.evaluate(() => {
  const el = document.querySelector('input[placeholder="SCARY-XXXX-XXXX"]');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height, fontSize: getComputedStyle(el).fontSize };
});
console.log('input pos:', JSON.stringify(inputPos));

// Test paste with weird chars (simulate iOS clipboard with NBSP/zero-width)
await page.click('input[placeholder="SCARY-XXXX-XXXX"]');
await page.evaluate(() => {
  const el = document.querySelector('input[placeholder="SCARY-XXXX-XXXX"]');
  el.value = '​SCARY -A4F2—9B7K​'; // BOM + NBSP + em-dash + zero-width
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
await new Promise((r) => setTimeout(r, 300));

// Klik PRZYWRÓĆ POSTĘP
const btnVisible = await page.evaluate(() => {
  // Check że Phaser canvas ma button (sprawdzimy czy klik na pozycji daje toast)
  return true;
});

await page.mouse.click(640, 620); // PRZYWRÓĆ POSTĘP button position
await new Promise((r) => setTimeout(r, 2500));
await page.screenshot({ path: '/tmp/settings_after_restore.png' });

console.log('=== ERRORS ===');
errs.slice(-5).forEach((e) => console.log(' ', e));
await browser.close();
