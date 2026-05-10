import puppeteer from 'puppeteer';
const browser = await puppeteer.launch({ headless: 'new', defaultViewport: { width: 1280, height: 720 } });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('game_wallet', JSON.stringify({coins: 1000, diamonds: 50}));
  localStorage.setItem('scary_run_player_v1', JSON.stringify({name: 'TESTER'}));
  localStorage.setItem('scaryrun_owned_skins', JSON.stringify(['default']));
  localStorage.setItem('scaryrun_equipped_skin', JSON.stringify('default'));
});
await page.goto('http://localhost:5173/?desktop=1', { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 3000));
await page.mouse.click(1230, 50); // gear
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: '/tmp/sm_settings_v2.png' });
console.log('settings shot done');
await browser.close();
