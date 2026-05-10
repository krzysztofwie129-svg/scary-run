// End-to-end smoke L4-L21 — sprawdza spawn pattern realność.
// Player nieśmiertelny przez 28s, zlicza spawny, tier, gap, max consecutive walls.

import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();

const isNoise = (t) => /char0[567]_|Hit_\d|Failed to process|api\/stats/i.test(t);
const errs = [];
page.on('pageerror', (e) => errs.push('PAGE: ' + e.message));
page.on('console', (msg) => {
  const t = msg.text();
  if (msg.type() === 'error' && !isNoise(t)) errs.push('[err] ' + t);
});

const pad = (s, n) => String(s).padStart(n);
const padR = (s, n) => String(s).padEnd(n);

async function probeLevel(N) {
  await page.evaluateOnNewDocument((idx) => {
    localStorage.clear();
    localStorage.setItem('scary_run_player_v1', JSON.stringify({ name: 'E2E' }));
    localStorage.setItem('scary_run_save_v1', JSON.stringify({
      session: {
        players: [{
          name: 'E2E', character: 'char01', level: idx, lives: 1, score: 0, coins: 0, diamonds: 0,
          finished: false, levelStartSnapshot: { coins: 0, diamonds: 0, score: 0 }, deathsThisLevel: 0,
        }],
        currentPlayerIndex: 0, numPlayers: 1, isMultiplayer: false,
      },
      currentLevel: idx, timestamp: Date.now(),
    }));
    localStorage.setItem('scaryrun_difficulty', 'normal');
  }, N - 1);
  await page.goto('http://localhost:5173/?desktop=1', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 2800));
  await page.mouse.click(640, 367); // KONTYNUUJ

  // Poll for GameScene + install immortality hook ASAP (before first collision).
  await page.evaluate(() => new Promise((resolve) => {
    window.__spawns = [];
    const tryHook = () => {
      const s = window.__game?.scene?.scenes?.find?.((x) => x.scene.key === 'GameScene' && x.scene.isActive());
      if (!s || !s.player || !s.spawnObstacle) return setTimeout(tryHook, 30);
      s.player.die = () => {};
      const orig = s.spawnObstacle.bind(s);
      s.spawnObstacle = function () {
        const before = s.obstacles.getLength();
        orig();
        const after = s.obstacles.getLength();
        if (after > before) window.__spawns.push({ tier: s.lastObstacleTier, t: s.time.now });
      };
      window.__sceneRef = s;
      resolve();
    };
    tryHook();
  }));

  const data = await page.evaluate(async () => {
    await new Promise((r) => setTimeout(r, 28000));
    const scene = window.__sceneRef;
    if (!scene) return { error: 'no GameScene ref' };
    const spawns = window.__spawns;

    let maxCW = 0, cur = 0;
    let minInt = Infinity;
    const ints = [];
    for (let i = 0; i < spawns.length; i++) {
      if (spawns[i].tier === 'wall') { cur++; if (cur > maxCW) maxCW = cur; } else cur = 0;
      if (i > 0) {
        const dt = spawns[i].t - spawns[i - 1].t;
        ints.push(dt);
        if (dt < minInt) minInt = dt;
      }
    }
    const tierCounts = spawns.reduce((a, s) => { a[s.tier] = (a[s.tier] || 0) + 1; return a; }, {});
    return {
      total: spawns.length,
      tierCounts,
      maxConsecutiveWall: maxCW,
      minIntervalMs: minInt === Infinity ? 0 : Math.round(minInt),
      avgIntervalMs: ints.length ? Math.round(ints.reduce((a, b) => a + b, 0) / ints.length) : 0,
      lvlName: scene.lvl?.name || '?',
      worldSpeed: Math.round(scene.worldSpeed || 0),
    };
  });
  return data;
}

console.log(`${pad('Lvl', 3)} ${padR('Name', 24)} ${pad('Spd', 4)} ${pad('Total', 6)} ${pad('Avg', 5)} ${pad('Min', 5)} ${pad('MaxW', 4)} Tiers`);
console.log('-'.repeat(110));

for (let N = 4; N <= 21; N++) {
  const r = await probeLevel(N);
  if (r.error) { console.log(`L${N} ERROR: ${r.error}`); continue; }
  const flag = r.maxConsecutiveWall > 2 ? ' WARN-3+walls' : (r.minIntervalMs > 0 && r.minIntervalMs < 500 ? ' WARN-tight' : '');
  console.log(
    `${pad('L' + N, 3)} ${padR(r.lvlName.slice(0, 24), 24)} ${pad(r.worldSpeed, 4)} ${pad(r.total, 6)} ${pad(r.avgIntervalMs, 5)} ${pad(r.minIntervalMs, 5)} ${pad(r.maxConsecutiveWall, 4)} ${JSON.stringify(r.tierCounts)}${flag}`,
  );
}

console.log();
console.log('=== ERRORS ===');
errs.slice(-10).forEach((e) => console.log(e));

await browser.close();
