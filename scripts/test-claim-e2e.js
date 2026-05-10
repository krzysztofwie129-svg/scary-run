// End-to-end test claim code restore flow.
// 1. Browser A — generate code, save coins/diamonds, capture code value
// 2. Browser B (fresh, different deviceId) — paste code, click PRZYWRÓĆ POSTĘP
// 3. Verify że Browser B teraz ma deviceId z A + zachowane coins/diamonds

import puppeteer from 'puppeteer';

const URL = 'https://scaryrun.win?desktop=1';
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });

// === Browser context A — user 1, generate code ===
console.log('=== BROWSER A: generate code, set wallet ===');
const ctxA = await browser.createBrowserContext();
const pageA = await ctxA.newPage();
const errsA = [];
pageA.on('pageerror', (e) => errsA.push('A: ' + e.message));
pageA.on('console', (msg) => {
  if (msg.type() === 'error' && !/char0[567]_|Hit_\d|Failed to process/i.test(msg.text())) {
    errsA.push('A: ' + msg.text());
  }
});

await pageA.evaluateOnNewDocument(() => {
  localStorage.clear();
  // Symulujemy user-A z prawdziwym postępem.
  localStorage.setItem('game_wallet', JSON.stringify({coins: 9999, diamonds: 88}));
  localStorage.setItem('game_bestScores', JSON.stringify({1: 1500, 2: 3000, 3: 4500}));
  localStorage.setItem('scaryrun_owned_skins', JSON.stringify(['default', 'vampire', 'pumpkin']));
  localStorage.setItem('scaryrun_equipped_skin', JSON.stringify('vampire'));
  localStorage.setItem('scary_run_player_v1', JSON.stringify({name: 'USERA'}));
});

await pageA.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise((r) => setTimeout(r, 3500));

// Symulujemy że PlayerSync zsynchronizował state User-A do KV (real gameplay
// trigger to addCoins → safeSet → markDirty → POST. W teście POST manualny).
const aDeviceForPost = await pageA.evaluate(() => localStorage.getItem('scary_run_device_id_v1'));
const snapshotData = await pageA.evaluate(() => {
  const keys = ['game_wallet', 'game_bestScores', 'scaryrun_owned_skins',
    'scaryrun_equipped_skin', 'scary_run_player_v1', 'scaryrun_wallet_init_v1'];
  const out = {};
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v != null) out[k] = v;
  }
  return out;
});
const postRes = await pageA.evaluate(async (deviceId, snapshot) => {
  const r = await fetch('/api/player', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, snapshot, ts: Date.now() }),
  });
  return await r.json();
}, aDeviceForPost, snapshotData);
console.log('  Manual sync POST result:', JSON.stringify(postRes));
// Update local sync ts żeby getLocalTs() na A zwrócił tę wartość (next initialLoad
// wykryje że own backend ts == local).
await pageA.evaluate(() => localStorage.setItem('scaryrun_sync_ts', String(Date.now())));

// Klik gear
await pageA.mouse.click(1125, 70);
await new Promise((r) => setTimeout(r, 1500));

// Klik WYGENERUJ KOD (Y=445 nowa pozycja)
await pageA.mouse.click(495, 445);
await new Promise((r) => setTimeout(r, 3000));

const generatedCode = await pageA.evaluate(() => localStorage.getItem('scaryrun_my_code'));
const aDeviceId = await pageA.evaluate(() => localStorage.getItem('scary_run_device_id_v1'));
console.log('  Generated code:', generatedCode);
console.log('  User A deviceId:', aDeviceId);

if (!generatedCode) {
  console.log('FAIL: kod nie wygenerowany');
  await browser.close();
  process.exit(1);
}

// Czekaj 3s na PlayerSync POST (debounced 2s) żeby snapshot trafil do KV
await new Promise((r) => setTimeout(r, 3000));
console.log('  Waiting for PlayerSync POST debounce (3s)...');

// Sprawdź backend ma snapshot
const backendCheck = await pageA.evaluate(async (did) => {
  const r = await fetch(`/api/player?deviceId=${encodeURIComponent(did)}`);
  return await r.json();
}, aDeviceId);
console.log('  Backend snapshot:', JSON.stringify(backendCheck).slice(0, 200));

await ctxA.close();

// === Browser context B — fresh user, restore from code ===
console.log();
console.log('=== BROWSER B: fresh, paste code, restore ===');
const ctxB = await browser.createBrowserContext();
const pageB = await ctxB.newPage();
const errsB = [];
pageB.on('pageerror', (e) => errsB.push('B: ' + e.message));
pageB.on('console', (msg) => {
  if (msg.type() === 'error' && !/char0[567]_|Hit_\d|Failed to process/i.test(msg.text())) {
    errsB.push('B: ' + msg.text());
  }
});

await pageB.evaluateOnNewDocument(() => {
  localStorage.clear();
  // User B = inny deviceId, brak postępu (fresh).
  localStorage.setItem('scary_run_player_v1', JSON.stringify({name: 'USERB'}));
});

await pageB.goto(URL, { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise((r) => setTimeout(r, 3500));

const bDeviceIdBefore = await pageB.evaluate(() => localStorage.getItem('scary_run_device_id_v1'));
console.log('  User B fresh deviceId:', bDeviceIdBefore);
console.log('  User B fresh wallet:', await pageB.evaluate(() => localStorage.getItem('game_wallet')));

await pageB.mouse.click(1125, 70); // gear
await new Promise((r) => setTimeout(r, 1500));

// Wpisz kod do DOM input — PASTE (cały tekst)
const inputSel = 'input[placeholder="SCARY-XXXX-XXXX"]';
await pageB.click(inputSel);
await new Promise((r) => setTimeout(r, 200));
// Symuluj paste z Notes (z ewentualnymi invisible chars):
await pageB.evaluate((sel, code) => {
  const el = document.querySelector(sel);
  // Symulacja iOS clipboard z invisible BOM:
  el.value = '﻿' + code + '​';
  el.dispatchEvent(new Event('input', { bubbles: true }));
}, inputSel, generatedCode);
await new Promise((r) => setTimeout(r, 300));

const inputVal = await pageB.$eval(inputSel, (el) => el.value);
console.log('  Input value (with invisibles):', JSON.stringify(inputVal));

// Klik PRZYWRÓĆ POSTĘP (Y=620 nowa pozycja)
await pageB.mouse.click(640, 620);
await new Promise((r) => setTimeout(r, 4000));

await pageB.screenshot({ path: '/tmp/claim_e2e_after_restore.png' });

// Verify że deviceId user A jest teraz na browser B + wallet się załadował
const bDeviceIdAfter = await pageB.evaluate(() => localStorage.getItem('scary_run_device_id_v1'));
const bWalletAfter = await pageB.evaluate(() => localStorage.getItem('game_wallet'));
const bSkinsAfter = await pageB.evaluate(() => localStorage.getItem('scaryrun_owned_skins'));

console.log('  User B deviceId AFTER restore:', bDeviceIdAfter);
console.log('  User B wallet AFTER restore:', bWalletAfter);
console.log('  User B skins AFTER restore:', bSkinsAfter);

const checks = [
  { name: 'deviceId po restore = USER A deviceId', pass: bDeviceIdAfter === aDeviceId },
  { name: 'wallet wrocil (coins:9999, diamonds:88)', pass: bWalletAfter && JSON.parse(bWalletAfter).coins === 9999 },
  { name: 'skins wrocily (vampire+pumpkin)', pass: bSkinsAfter && bSkinsAfter.includes('vampire') && bSkinsAfter.includes('pumpkin') },
];

console.log();
console.log('=== CHECKS ===');
let failed = 0;
for (const c of checks) {
  console.log(`  ${c.pass ? '✓' : '✗'} ${c.name}`);
  if (!c.pass) failed++;
}

console.log();
console.log('=== ERRORS ===');
[...errsA, ...errsB].slice(-5).forEach((e) => console.log(' ', e));

await browser.close();
process.exit(failed > 0 ? 1 : 0);
