// Smoke po przeniesieniu folderów craftpix-* do kosza.
// Cel: potwierdzić, że gra startuje i NIC nie próbuje ładować z usuniętych assetów.
// Serwuje dist przez `vite preview`. Gwarantowany kill Chrome + serwera (try/finally + sygnały).
import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import fs from 'fs';

const PORT = 4599;
const BASE = `http://localhost:${PORT}`;
const OUT = '/tmp/sr-craftpix-verify';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let browser = null;
let server = null;

function killAll() {
  try { browser && browser.process() && browser.process().kill('SIGKILL'); } catch {}
  try { server && server.kill('SIGKILL'); } catch {}
}
for (const sig of ['SIGINT', 'SIGTERM', 'exit']) process.on(sig, killAll);

const all404 = [];
const reqFailed = [];
const consoleErrs = [];
const pageErrs = [];

try {
  // 1) Serwuj zbudowane dist
  server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: '/Users/krzysztof/scary-run', stdio: 'ignore',
  });
  // poczekaj aż port odpowie
  let up = false;
  for (let i = 0; i < 40; i++) {
    try { const r = await fetch(BASE); if (r.ok) { up = true; break; } } catch {}
    await sleep(250);
  }
  if (!up) throw new Error('vite preview nie wstał na ' + BASE);

  browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  page.on('pageerror', (e) => pageErrs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrs.push(m.text()); });
  page.on('requestfailed', (r) => reqFailed.push(r.url()));
  page.on('response', (r) => { if (r.status() === 404) all404.push(r.url()); });

  // 2) Załaduj grę
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForSelector('canvas', { timeout: 15000 });
  await sleep(6500); // boot + preload wszystkich assetów

  const scenes = await page.evaluate(() => {
    try { return window.__game.scene.getScenes(true).map((s) => s.scene.key); }
    catch { return ['<no __game>']; }
  });
  await page.screenshot({ path: `${OUT}/01_menu.png` });

  // 3) Wejdź w grę (klik środka — tap to play / menu graj)
  await page.mouse.click(640, 360);
  await sleep(1200);
  await page.mouse.click(640, 420);
  await sleep(4000);
  const scenes2 = await page.evaluate(() => {
    try { return window.__game.scene.getScenes(true).map((s) => s.scene.key); }
    catch { return ['<no __game>']; }
  });
  await page.screenshot({ path: `${OUT}/02_after_play.png` });

  // 4) Raport
  const craftpix404 = all404.filter((u) => /craftpix/i.test(u));
  const assetFail = reqFailed.filter((u) => /\.(png|webp|json|jpg|mp3|ogg)/i.test(u));

  console.log('\n========== RAPORT ==========');
  console.log('Sceny po boot :', scenes.join(', '));
  console.log('Sceny po graj :', scenes2.join(', '));
  console.log('Canvas        :', 'OK (waitForSelector przeszło)');
  console.log('404 łącznie   :', all404.length);
  console.log('404 craftpix  :', craftpix404.length, craftpix404.slice(0, 5).join(' | '));
  console.log('Failed assety :', assetFail.length, assetFail.slice(0, 8).map(u=>u.split('/').pop()).join(' | '));
  console.log('pageerror     :', pageErrs.length, pageErrs.slice(0,3).join(' | '));
  console.log('console.error :', consoleErrs.length);
  if (all404.length) console.log('\nWszystkie 404:\n  ' + all404.map(u=>u.replace(BASE,'')).join('\n  '));

  const bootOK = scenes.includes('MenuScene');
  const noCraftpix = craftpix404.length === 0;
  const noAssetFail = assetFail.length === 0;
  console.log('\n========== WERDYKT ==========');
  console.log('Boot do MenuScene        :', bootOK ? 'PASS' : 'FAIL');
  console.log('Zero 404 z craftpix      :', noCraftpix ? 'PASS' : 'FAIL');
  console.log('Zero failed obrazów/audio:', noAssetFail ? 'PASS' : 'FAIL');
  console.log('Screeny:', OUT);
  console.log(bootOK && noCraftpix && noAssetFail ? '\n>>> WSZYSTKO OK <<<' : '\n>>> SĄ PROBLEMY <<<');
} finally {
  killAll();
}
