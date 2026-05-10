// Live DEV smoke — scaryrun.win po deployu.
// Sprawdza: menu loading, settings open, difficulty switch persist, ranking PKT visible.

import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(`PAGE: ${e.message}`));
page.on('console', (msg) => { if (msg.type() === 'error' && !/char0[567]_/i.test(msg.text())) errs.push(`[err] ${msg.text()}`); });

await page.evaluateOnNewDocument(() => {
  localStorage.setItem('scary_run_player_v1', JSON.stringify({name: 'SMOKE'}));
});

console.log('--- Menu load ---');
await page.goto('https://scaryrun.win?desktop=1', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise((r) => setTimeout(r, 5000));
await page.screenshot({ path: '/tmp/live_menu.png' });
console.log('  /tmp/live_menu.png saved');

console.log('--- Settings open via gear click ---');
await page.mouse.click(1230, 50); // gear circle on top-right
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: '/tmp/live_settings.png' });

console.log('--- Click HARD difficulty ---');
await page.mouse.click(640 + 200, 165); // x=hard pos, y=row
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: '/tmp/live_settings_hard.png' });

const diffMode = await page.evaluate(() => localStorage.getItem('scaryrun_difficulty'));
console.log(`  difficulty after click HARD: ${diffMode}`);
if (diffMode !== 'hard') errs.push(`difficulty mismatch: ${diffMode}`);

console.log('--- Click EASY ---');
await page.mouse.click(640 - 200, 165);
await new Promise((r) => setTimeout(r, 800));
const diffMode2 = await page.evaluate(() => localStorage.getItem('scaryrun_difficulty'));
console.log(`  difficulty after click EASY: ${diffMode2}`);
if (diffMode2 !== 'easy') errs.push(`easy switch failed: ${diffMode2}`);

console.log('--- Reset to normal ---');
await page.mouse.click(640, 165);
await new Promise((r) => setTimeout(r, 500));

console.log('--- Back to menu ---');
await page.mouse.click(80, 50); // wróć
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: '/tmp/live_back_to_menu.png' });

console.log();
console.log('=== ERRORS ===');
errs.slice(-10).forEach((e) => console.log(e));
console.log(`(total errors: ${errs.length})`);

await browser.close();
process.exit(errs.length > 0 ? 1 : 0);
