// Smoke po konwersji PNG->WebP (skiny char04-07, char01-03 Dead/Win, UI).
// Weryfikuje: boot menu, sklep ze skinami (podgląd 4 skinów), equipped skin w grze.
// Łapie WSZYSTKIE 404 — szczególnie .png (nie powinno być żadnego) i Character 0X.
// Gwarantowany kill Chrome + serwera.
import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import fs from 'fs';

const PORT = 4601;
const BASE = `http://localhost:${PORT}`;
const OUT = '/tmp/sr-webp-verify';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let browser = null, server = null;
function killAll() {
  try { browser && browser.process() && browser.process().kill('SIGKILL'); } catch {}
  try { server && server.kill('SIGKILL'); } catch {}
}
for (const sig of ['SIGINT', 'SIGTERM', 'exit']) process.on(sig, killAll);

const r404 = [];
function track(page) {
  page.on('response', (r) => { if (r.status() === 404) r404.push(r.url().replace(BASE, '')); });
  page.on('requestfailed', (r) => r404.push('FAIL ' + r.url().replace(BASE, '')));
}

try {
  server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'],
    { cwd: '/Users/krzysztof/scary-run', stdio: 'ignore' });
  let up = false;
  for (let i = 0; i < 40; i++) { try { if ((await fetch(BASE)).ok) { up = true; break; } } catch {} await sleep(250); }
  if (!up) throw new Error('preview nie wstał');

  browser = await puppeteer.launch({ headless: 'new' });

  // --- TEST 1: menu + sklep (podgląd wszystkich 4 skinów idle) ---
  const p1 = await browser.newPage();
  await p1.setViewport({ width: 1280, height: 720 });
  track(p1);
  await p1.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await p1.waitForSelector('canvas', { timeout: 15000 });
  await sleep(5000);
  await p1.screenshot({ path: `${OUT}/01_menu.png` });
  // otwórz sklep przez ShopScene (ikona sklepu lewy-góra ~ x60,y150) — klik kilku miejsc
  await p1.mouse.click(60, 150); await sleep(2500);
  await p1.screenshot({ path: `${OUT}/02_shop.png` });
  const after404_shop = r404.length;

  // --- TEST 2: equipped skin (char04 'drox') w grze ---
  const p2 = await browser.newPage();
  await p2.setViewport({ width: 1280, height: 720 });
  track(p2);
  await p2.evaluateOnNewDocument(() => {
    localStorage.setItem('scaryrun_equipped_skin', JSON.stringify('drox')); // char04
  });
  await p2.goto(`${BASE}/`, { waitUntil: 'networkidle2', timeout: 30000 });
  await p2.waitForSelector('canvas', { timeout: 15000 });
  await sleep(5000);
  await p2.mouse.click(640, 360); await sleep(1000);
  await p2.mouse.click(640, 420); await sleep(4000);
  await p2.screenshot({ path: `${OUT}/03_skin_equipped.png` });

  // --- RAPORT ---
  const png404 = r404.filter((u) => /\.png/i.test(u));
  const char404 = r404.filter((u) => /Character%20|Character 0|characters\//i.test(u));
  const api404 = r404.filter((u) => /\/api\//i.test(u));
  const other404 = r404.filter((u) => !/\.png/i.test(u) && !/\/api\//i.test(u) && !/Character/i.test(u));

  console.log('\n========== RAPORT ==========');
  console.log('404 łącznie       :', r404.length);
  console.log('  .png (KRYTYCZNE):', png404.length, png404.slice(0, 8).join(' | '));
  console.log('  Character/skiny :', char404.length, char404.slice(0, 8).join(' | '));
  console.log('  /api/ (OK, brak backendu):', api404.length);
  console.log('  inne            :', other404.length, other404.slice(0, 8).join(' | '));
  console.log('Screeny:', OUT);

  const pass = png404.length === 0 && char404.length === 0 && other404.length === 0;
  console.log('\n========== WERDYKT ==========');
  console.log('Zero 404 .png          :', png404.length === 0 ? 'PASS' : 'FAIL');
  console.log('Zero 404 skinów/postaci:', char404.length === 0 ? 'PASS' : 'FAIL');
  console.log('Zero innych 404        :', other404.length === 0 ? 'PASS' : 'FAIL');
  console.log(pass ? '\n>>> OPTYMALIZACJA OK — gra ładuje WebP bez braków <<<' : '\n>>> SĄ BRAKI — sprawdź wyżej <<<');
} finally {
  killAll();
}
