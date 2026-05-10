// Test claim generation bug — capture console errors, network requests, screenshot.
import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
const errs = [], logs = [], reqs = [];
page.on('pageerror', (e) => errs.push(`PAGE: ${e.message}\n${e.stack?.split('\n').slice(0, 5).join('\n')}`));
page.on('console', (msg) => {
  const t = msg.text();
  if (msg.type() === 'error' && !/char0[567]_|Hit_\d|Failed to process file/.test(t)) errs.push(`[err] ${t}`);
  if (msg.type() === 'log' || msg.type() === 'warn') logs.push(`[${msg.type()}] ${t}`);
});
page.on('request', (req) => {
  if (req.url().includes('/api/claim')) reqs.push(`${req.method()} ${req.url()} body=${req.postData()}`);
});
page.on('response', async (res) => {
  if (res.url().includes('/api/claim')) {
    try {
      const text = await res.text();
      reqs.push(`<- ${res.status()} ${text.slice(0, 200)}`);
    } catch {}
  }
});

await page.evaluateOnNewDocument(() => {
  localStorage.clear();
  localStorage.setItem('scary_run_player_v1', JSON.stringify({name: 'TESTBUG'}));
});

console.log('--- Goto live DEV ---');
await page.goto('https://scaryrun.win?desktop=1', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise((r) => setTimeout(r, 3500));

console.log('--- Click gear ---');
await page.mouse.click(1230, 50);
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: '/tmp/claim_bug_01_settings.png' });

console.log('--- Click WYGENERUJ KOD ---');
// _makeBtn(GAME_WIDTH / 2 - 145, 380, 240, 45, 'WYGENERUJ KOD'...) → x=495, y=380
await page.mouse.click(495, 380);
await new Promise((r) => setTimeout(r, 3000));
await page.screenshot({ path: '/tmp/claim_bug_02_after_gen.png' });

const localCode = await page.evaluate(() => localStorage.getItem('scaryrun_my_code'));
console.log('localStorage scaryrun_my_code:', localCode);

console.log();
console.log('=== /api/claim REQUESTS ===');
reqs.forEach((r) => console.log(r));
console.log();
console.log('=== ERRORS ===');
errs.slice(-10).forEach((e) => console.log(e));
console.log();
console.log('=== LOGS (last 10) ===');
logs.slice(-10).forEach((l) => console.log(l));

await browser.close();
