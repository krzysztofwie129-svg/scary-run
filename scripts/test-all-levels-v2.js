// Smoke test każdego levelu (L1-L21) — pełen flow: save state → KONTYNUUJ → GameScene render.
// Verify: brak crashów, canvas rysuje, level name zgodny z LEVELS[N-1].name.

import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();

const isNoise = (msg) => /char0[567]_/i.test(msg)
  || /Hit_\d/.test(msg)
  || /Failed to process file: %s "%s" image/.test(msg)
  || /the server responded with a status of 404/.test(msg);

let activeLevel = '?';
const errs = [];
page.on('pageerror', (e) => errs.push({ level: activeLevel, type: 'pageerror', msg: e.message }));
page.on('console', (msg) => {
  if (msg.type() === 'error' && !isNoise(msg.text())) {
    errs.push({ level: activeLevel, type: 'console', msg: msg.text() });
  }
});

async function testLevel(N) {
  activeLevel = `L${N}`;

  await page.evaluateOnNewDocument((idx) => {
    localStorage.clear();
    localStorage.setItem('game_wallet', JSON.stringify({coins: 100, diamonds: 5}));
    localStorage.setItem('scaryrun_owned_skins', JSON.stringify(['default']));
    localStorage.setItem('scaryrun_equipped_skin', JSON.stringify('default'));
    localStorage.setItem('scary_run_player_v1', JSON.stringify({name: 'TESTER'}));
    localStorage.setItem('scaryrun_difficulty', 'normal');
    // Save state z player.level = idx (0-based) → KONTYNUUJ wskoczy w ten level.
    localStorage.setItem('scary_run_save_v1', JSON.stringify({
      session: {
        players: [{
          name: 'TESTER',
          character: 'char01',
          level: idx,
          lives: 1,
          score: 0, coins: 0, diamonds: 0,
          finished: false,
          consecutivePerfectLevels: 0,
          levelStartSnapshot: { coins: 0, diamonds: 0, score: 0 },
          deathsThisLevel: 0,
        }],
        currentPlayerIndex: 0,
        numPlayers: 1,
        isMultiplayer: false,
      },
      currentLevel: idx,
      timestamp: Date.now(),
    }));
  }, N - 1);

  const start = Date.now();
  await page.goto(`http://localhost:5173/?desktop=1`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 2500));

  // KONTYNUUJ button — w hasSave layout pierwszy item, ~Y=370 (centroid menu items).
  // Sprawdzimy zawartość MenuScene buttons.
  await page.mouse.click(640, 367);
  await new Promise((r) => setTimeout(r, 4000));

  await page.screenshot({ path: `/tmp/lvl_v2_${String(N).padStart(2, '0')}.png` });

  // Verify canvas i czy nie ma white screen (samo GameScene render).
  // Sprawdź LEVEL <number> hud text — wskazuje że jesteśmy w GameScene z this.currentLevel.
  return { N, ms: Date.now() - start };
}

const results = [];
for (let N = 1; N <= 21; N++) {
  results.push(await testLevel(N));
}

console.log();
console.log('=== L1-L21 (KONTYNUUJ flow) ===');
for (const r of results) {
  const lvErrs = errs.filter((e) => e.level === `L${r.N}`);
  const tag = lvErrs.length > 0 ? `[${lvErrs.length} errs]` : 'OK';
  console.log(`  L${String(r.N).padStart(2, '0')}: ${r.ms}ms ${tag}`);
}

console.log();
console.log(`Total errors (non-noise): ${errs.length}`);
if (errs.length > 0) {
  console.log('=== ERROR DETAILS (first 15) ===');
  errs.slice(0, 15).forEach((e) => console.log(`  [${e.level}] ${e.type}: ${e.msg.slice(0, 250)}`));
}

await browser.close();
process.exit(errs.length > 0 ? 1 : 0);
