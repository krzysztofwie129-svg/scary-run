// Weryfikacja HUD safe-area — porównuje gameplay bez notcha (web, margin=0)
// vs z symulowanym notchem (--safe-area-left: 47px). Łapie błędy konsoli.
import puppeteer from 'puppeteer';

const VIEWPORT = { width: 1280, height: 720 };

async function runScenario(label, notchPx) {
  const browser = await puppeteer.launch({ headless: 'new', defaultViewport: VIEWPORT });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`PAGE ERR: ${e.message}`));
  page.on('requestfailed', (r) => {
    const u = r.url();
    if (!u.includes('/api/')) errors.push(`REQ FAIL: ${u} ${r.failure()?.errorText}`);
  });

  // Skip do L5 przez save state (level 4 = L5 1-based).
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('game_wallet', JSON.stringify({ coins: 1000, diamonds: 50 }));
      localStorage.setItem('scaryrun_owned_skins', JSON.stringify(['default']));
      localStorage.setItem('scaryrun_equipped_skin', JSON.stringify('default'));
      localStorage.setItem('scary_run_save_v1', JSON.stringify({
        session: { players: [{ name: 'TEST', character: 'char01', level: 4, lives: 1, score: 0, coins: 0, diamonds: 0 }], currentPlayerIndex: 0, numPlayers: 1, isMultiplayer: false },
        currentLevel: 4,
        timestamp: Date.now(),
      }));
    } catch {}
  });

  await page.goto('http://localhost:5173/?desktop=1', { waitUntil: 'networkidle2' });

  // Symuluj notch — nadpisz CSS var (inline style na <html> bije :root z <style>).
  if (notchPx > 0) {
    await page.evaluate((px) => {
      document.documentElement.style.setProperty('--safe-area-left', px + 'px');
    }, notchPx);
  }

  await new Promise((r) => setTimeout(r, 4500));
  await page.screenshot({ path: `/tmp/hud_${label}_menu.png` });

  // Klik KONTYNUUJ → GameScene.
  await page.mouse.click(640, 367);
  // Gameplay startuje — tapuj (skok) co 700ms żeby player przeżył, łap HUD.
  await new Promise((r) => setTimeout(r, 1400));
  await page.screenshot({ path: `/tmp/hud_${label}_game.png` });
  // Jeszcze jeden screenshot później, z tapowaniem między.
  for (let i = 0; i < 4; i++) {
    await page.mouse.click(640, 360);
    await new Promise((r) => setTimeout(r, 600));
  }
  await page.screenshot({ path: `/tmp/hud_${label}_game2.png` });

  // Odczytaj margin policzony przez GameScene + canvas geometry.
  const probe = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    const cv = document.querySelector('canvas');
    return {
      cssVarLeft: cs.getPropertyValue('--safe-area-left').trim(),
      canvasW: cv?.clientWidth, canvasH: cv?.clientHeight,
      innerW: window.innerWidth,
    };
  });

  await browser.close();
  return { label, errors, probe };
}

const noNotch = await runScenario('nonotch', 0);
const withNotch = await runScenario('notch', 47);

console.log('=== BEZ NOTCHA (web, margin powinien być 0) ===');
console.log('  cssVar:', noNotch.probe.cssVarLeft, '| canvas:', noNotch.probe.canvasW + 'x' + noNotch.probe.canvasH);
console.log('  errors:', noNotch.errors.length ? noNotch.errors : 'BRAK');
console.log('=== Z NOTCHEM 47px (HUD powinien być przesunięty) ===');
console.log('  cssVar:', withNotch.probe.cssVarLeft, '| canvas:', withNotch.probe.canvasW + 'x' + withNotch.probe.canvasH);
console.log('  errors:', withNotch.errors.length ? withNotch.errors : 'BRAK');
console.log('\nScreenshoty: /tmp/hud_nonotch_game.png  /tmp/hud_notch_game.png');
