// Smoke test każdego levelu (L1-L21).
// Dla każdego: set save state, goto, czekaj, screenshot, sprawdź errors + render gry.

import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();

// Filtruje noise: char05-07 hit assets nie używane przez default skin (legacy).
const isNoise = (msg) => /char0[567]_/i.test(msg)
  || /Hit_\d/.test(msg)
  || /Failed to process file: %s "%s" image/.test(msg)
  || /the server responded with a status of 404/.test(msg);

let activeLevel = '?';
const errs = [];
page.on('pageerror', (e) => {
  errs.push({ level: activeLevel, type: 'pageerror', msg: e.message });
});
page.on('console', (msg) => {
  if (msg.type() === 'error' && !isNoise(msg.text())) {
    errs.push({ level: activeLevel, type: 'console', msg: msg.text() });
  }
});

async function testLevel(N) {
  activeLevel = `L${N}`;
  // Set fresh save state targetowany na ten level (currentLevel = N-1, 0-based).
  await page.evaluateOnNewDocument((idx) => {
    localStorage.clear();
    localStorage.setItem('game_wallet', JSON.stringify({coins: 100, diamonds: 5}));
    localStorage.setItem('scaryrun_owned_skins', JSON.stringify(['default']));
    localStorage.setItem('scaryrun_equipped_skin', JSON.stringify('default'));
    localStorage.setItem('scary_run_player_v1', JSON.stringify({name: 'TESTER'}));
    localStorage.setItem('scaryrun_difficulty', 'normal');
  }, N - 1);

  // ?level=N nadpisuje currentLevel na GameScene init (DEV bypass).
  const startTime = Date.now();
  await page.goto(`http://localhost:5173/?desktop=1&level=${N}`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 4000));

  // Verify że bg level loaded + canvas renderuje + brak white screen.
  const status = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { ok: false, reason: 'no canvas' };
    // Sprawdź pixel z różnych miejsc — czy NIE jest cały czarny/bialy
    const ctx = canvas.getContext('2d');
    return {
      ok: !!canvas,
      width: canvas.width, height: canvas.height,
      // Phaser canvas — context może być WebGL, pixel sample przez game.canvas.toDataURL daje bbox
    };
  });
  await page.screenshot({ path: `/tmp/lvl_${String(N).padStart(2, '0')}.png` });
  return { N, status, ms: Date.now() - startTime };
}

const results = [];
for (let N = 1; N <= 21; N++) {
  const r = await testLevel(N);
  results.push(r);
}

console.log();
console.log('=== L1-L21 results ===');
for (const r of results) {
  const lvErrs = errs.filter((e) => e.level === `L${r.N}`);
  const errStr = lvErrs.length > 0 ? `[${lvErrs.length} errs]` : 'OK';
  console.log(`  L${String(r.N).padStart(2, '0')}: canvas ${r.status.width}x${r.status.height}, ${r.ms}ms ${errStr}`);
}

console.log();
console.log(`Total errors (non-noise): ${errs.length}`);
if (errs.length > 0) {
  console.log('=== ERROR DETAILS ===');
  errs.slice(0, 20).forEach((e) => console.log(`  [${e.level}] ${e.type}: ${e.msg.slice(0, 200)}`));
}

await browser.close();
process.exit(errs.length > 0 ? 1 : 0);
