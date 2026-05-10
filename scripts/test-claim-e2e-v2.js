// E2E claim z REAL user typing (page.type) — respektuje maxLength.
import puppeteer from 'puppeteer';

const URL = 'https://scaryrun.win?desktop=1';
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });

// === A: generate code ===
const ctxA = await browser.createBrowserContext();
const pageA = await ctxA.newPage();

await pageA.evaluateOnNewDocument(() => {
  localStorage.clear();
  localStorage.setItem('game_wallet', JSON.stringify({coins: 7777, diamonds: 33}));
  localStorage.setItem('scaryrun_owned_skins', JSON.stringify(['default', 'vampire']));
  localStorage.setItem('scaryrun_equipped_skin', JSON.stringify('vampire'));
  localStorage.setItem('scary_run_player_v1', JSON.stringify({name: 'USERA'}));
});
await pageA.goto(URL, { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 3000));

// Manual sync POST do KV (real-world: addCoins → safeSet → markDirty)
const aDeviceId = await pageA.evaluate(() => localStorage.getItem('scary_run_device_id_v1'));
const snap = await pageA.evaluate(() => {
  const out = {};
  for (const k of ['game_wallet', 'scaryrun_owned_skins', 'scaryrun_equipped_skin', 'scary_run_player_v1']) {
    const v = localStorage.getItem(k);
    if (v != null) out[k] = v;
  }
  return out;
});
await pageA.evaluate(async (did, s) => {
  await fetch('/api/player', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId: did, snapshot: s, ts: Date.now() }) });
}, aDeviceId, snap);

await pageA.mouse.click(1125, 70);
await new Promise((r) => setTimeout(r, 1500));
await pageA.mouse.click(495, 445); // WYGENERUJ KOD
await new Promise((r) => setTimeout(r, 2500));
const code = await pageA.evaluate(() => localStorage.getItem('scaryrun_my_code'));
console.log('Generated code:', code, '(length:', code?.length, ')');
await ctxA.close();

// === B: fresh, paste z REAL typing ===
const ctxB = await browser.createBrowserContext();
const pageB = await ctxB.newPage();
await pageB.evaluateOnNewDocument(() => { localStorage.clear(); });
await pageB.goto(URL, { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 3000));
await pageB.mouse.click(1125, 70);
await new Promise((r) => setTimeout(r, 1500));

// REAL typing: page.type symuluje user keyboard, respektuje maxLength
await pageB.click('input[placeholder="SCARY-XXXX-XXXX"]');
await pageB.type('input[placeholder="SCARY-XXXX-XXXX"]', code, { delay: 30 });

const inputVal = await pageB.$eval('input[placeholder="SCARY-XXXX-XXXX"]', (el) => el.value);
console.log('Input value after typing:', JSON.stringify(inputVal), '(length:', inputVal.length, ')');

if (inputVal.length !== code.length) {
  console.log(`✗ FAIL: typing dał ${inputVal.length} znaków zamiast ${code.length} (maxLength bug)`);
} else {
  console.log(`✓ Pełny kod (${inputVal.length}) zaakceptowany przez input`);
}

// PRZYWRÓĆ POSTĘP klik
await pageB.mouse.click(640, 620);
await new Promise((r) => setTimeout(r, 4000));

const afterRestore = await pageB.evaluate(() => ({
  deviceId: localStorage.getItem('scary_run_device_id_v1'),
  wallet: localStorage.getItem('game_wallet'),
  skins: localStorage.getItem('scaryrun_owned_skins'),
}));
console.log('After restore:', JSON.stringify(afterRestore));

const ok = afterRestore.deviceId === aDeviceId
  && afterRestore.wallet?.includes('7777')
  && afterRestore.skins?.includes('vampire');
console.log(ok ? '✓ E2E OK' : '✗ E2E FAIL');

await browser.close();
process.exit(ok ? 0 : 1);
