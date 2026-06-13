// Konwersja PNG -> WebP (q90) dla skinów char04-07, char01-03 Dead/Win i UI.
// Backup = git (public/assets śledzone). Usuwa .png po udanej konwersji.
import sharp from 'sharp';
import fs from 'fs';
import { execSync } from 'child_process';

const ROOT = '/Users/krzysztof/scary-run/public/assets';
const Q = 90;

function findPngs(globRoots) {
  const out = [];
  for (const r of globRoots) {
    if (!fs.existsSync(r)) continue;
    const list = execSync(`find "${r}" -iname '*.png'`).toString().trim();
    if (list) out.push(...list.split('\n'));
  }
  return out;
}

const targets = [
  // skiny char04-07: cały Png/
  ...['04', '05', '06', '07'].map((n) => `${ROOT}/characters/Character ${n}/Png`),
  // char01-03: Dead + Win (jedyne PNG tam)
  ...['char01', 'char02', 'char03'].flatMap((c) => [`${ROOT}/characters/${c}/Dead`, `${ROOT}/characters/${c}/Win`]),
  // UI
  `${ROOT}/ui`,
];

const pngs = findPngs(targets);
console.log(`Znaleziono ${pngs.length} plików PNG do konwersji...`);

let origBytes = 0, newBytes = 0, ok = 0, fail = 0;
const errors = [];

// batch po 32 dla pamięci
const BATCH = 32;
for (let i = 0; i < pngs.length; i += BATCH) {
  const chunk = pngs.slice(i, i + BATCH);
  await Promise.all(chunk.map(async (png) => {
    const webp = png.replace(/\.png$/i, '.webp');
    try {
      const o = fs.statSync(png).size;
      const buf = await sharp(png).webp({ quality: Q, alphaQuality: 100 }).toBuffer();
      fs.writeFileSync(webp, buf);
      fs.unlinkSync(png);
      origBytes += o; newBytes += buf.length; ok++;
    } catch (e) {
      fail++; errors.push(`${png}: ${e.message}`);
    }
  }));
  if (i % 256 === 0) process.stdout.write(`  ${Math.min(i + BATCH, pngs.length)}/${pngs.length}\r`);
}

console.log(`\n\n=== WYNIK KONWERSJI ===`);
console.log(`OK: ${ok}  |  FAIL: ${fail}`);
console.log(`PNG : ${(origBytes / 1048576).toFixed(1)} MB`);
console.log(`WebP: ${(newBytes / 1048576).toFixed(1)} MB`);
console.log(`Oszczędność: ${((origBytes - newBytes) / 1048576).toFixed(1)} MB (${Math.round(100 - newBytes / origBytes * 100)}%)`);
if (errors.length) { console.log('\nBŁĘDY:'); errors.slice(0, 20).forEach((e) => console.log('  ' + e)); }
