// Difficulty — tryb trudności gry.
//
// Tryby:
//   easy   → 30% trudności poziomu i bossa (-30%), score też -30%.
//   normal → bez zmian (1.0x).
//   hard   → +5% trudności PER LEVEL kumulatywnie + +5% score.
//
// Trudność wpływa na:
//   - GameScene worldSpeed: speed * difficultyFactor
//   - GameScene obstacleSpawnRate: min/max * (1/difficultyFactor) (mniejszy interval = więcej obstacles na hard)
//   - BossFightScene bossHPMax: HP * difficultyFactor
//   - BossFightScene attackInterval: mniej dla hard (szybsze ataki)
//   - ScoreSystem: runScore * scoreMultiplier
//
// Persistowane w localStorage 'scaryrun_difficulty'.

const STORAGE_KEY = 'scaryrun_difficulty';
const DEFAULT = 'normal';
const VALID = new Set(['easy', 'normal', 'hard']);

export const DIFFICULTY_LABELS = {
  easy: 'Łatwy',
  normal: 'Normalny',
  hard: 'Trudny',
};

export function getDifficulty() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && VALID.has(v)) return v;
  } catch (e) { /* ignore */ }
  return DEFAULT;
}

export function setDifficulty(mode) {
  if (!VALID.has(mode)) return false;
  try { localStorage.setItem(STORAGE_KEY, mode); return true; }
  catch (e) { return false; }
}

/** Multiplier dla trudności poziomu (worldSpeed, boss HP, attack frequency).
 *  easy: 0.7 (mniej HP, wolniej, mniej spawn'ow)
 *  normal: 1.0
 *  hard: 1.05 ^ levelNumber (kumulatywnie per level, +5% per level)
 */
export function getDifficultyMultiplier(levelNumber = 1) {
  const mode = getDifficulty();
  if (mode === 'easy') return 0.7;
  if (mode === 'hard') return Math.pow(1.05, Math.max(1, Math.floor(levelNumber)));
  return 1.0;
}

/** Score multiplier — pomnożenie końcowego runScore po finalize.
 *  easy: 0.7 (-30% punktów)
 *  normal: 1.0
 *  hard: 1.05 (+5%)
 */
export function getScoreMultiplier() {
  const mode = getDifficulty();
  if (mode === 'easy') return 0.7;
  if (mode === 'hard') return 1.05;
  return 1.0;
}
