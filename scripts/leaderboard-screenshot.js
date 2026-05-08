// Leaderboard screenshot — load menu → click RANKING → snap.
import puppeteer from 'puppeteer';
const browser = await puppeteer.launch();
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
// Inject fake leaderboard entries via localStorage BEFORE app loads.
await page.goto('http://localhost:5173/?desktop=1');
await page.evaluate(() => {
  const entries = [
    { name: 'SANDRA', score: 1868, level: 6, coins: 110, date: '2026-05-07T10:00:00Z' },
    { name: 'KIJ', score: 1790, level: 3, coins: 141, date: '2026-05-08T10:00:00Z' },
    { name: 'SAMUEL', score: 1777, level: 4, coins: 154, date: '2026-05-07T10:00:00Z' },
    { name: 'SAMEK', score: 1656, level: 4, coins: 156, date: '2026-05-07T10:00:00Z' },
    { name: 'WOJOWNIK1994', score: 1471, level: 3, coins: 138, date: '2026-05-07T10:00:00Z' },
    { name: 'SANDRA', score: 1396, level: 5, coins: 89, date: '2026-05-07T10:00:00Z' },
    { name: 'SAMUEL', score: 1384, level: 3, coins: 121, date: '2026-05-07T10:00:00Z' },
    { name: 'DANUTA', score: 1297, level: 4, coins: 75, date: '2026-05-07T10:00:00Z' },
    { name: 'WOJOWNIK1994', score: 1220, level: 3, coins: 117, date: '2026-05-07T10:00:00Z' },
    { name: 'WOJOWNIK1994', score: 1191, level: 3, coins: 116, date: '2026-05-07T10:00:00Z' },
  ];
  localStorage.setItem('scary_run_leaderboard_v1', JSON.stringify(entries));
});
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('canvas', { timeout: 30000 });
await new Promise((r) => setTimeout(r, 4000));
// First click unlocks audio (Phaser sound.locked → input.once pointerdown).
// Second click triggers RANKING button (no save → items[2] at y=500).
await page.mouse.click(640, 500);
await new Promise((r) => setTimeout(r, 500));
await page.mouse.click(640, 500);
await new Promise((r) => setTimeout(r, 3000));
await page.screenshot({ path: '/tmp/leaderboard.png' });
console.log('Saved /tmp/leaderboard.png');
await browser.close();
