// Persistent storage layer (localStorage z fallback in-memory dla private mode).
// Klucze prefix "game_": wallet, bestScores, currentLevel, totalRuns, lastRankingScore.

import { markDirty } from './PlayerSync.js';

const PREFIX = 'game_';
const KEYS = {
  wallet: PREFIX + 'wallet',
  bestScores: PREFIX + 'bestScores',
  currentLevel: PREFIX + 'currentLevel',
  totalRuns: PREFIX + 'totalRuns',
  lastRankingScore: PREFIX + 'lastRankingScore',
};

const _memFallback = {};

function safeGet(key, defaultVal) {
  if (key in _memFallback) return _memFallback[key];
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return defaultVal;
    const parsed = JSON.parse(raw);
    return parsed == null ? defaultVal : parsed;
  } catch (e) {
    console.warn(`storage.safeGet ${key} corrupted, using default`, e?.message);
    return defaultVal;
  }
}

function safeSet(key, val) {
  _memFallback[key] = val;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    // private mode / quota — _memFallback zachowuje wartość dla bieżącej sesji.
  }
  // PlayerSync hybrid backup — debounced POST do CF KV po 2s.
  try { markDirty(); } catch (e) { /* ignore */ }
}

// === Wallet ===

export function getWallet() {
  const w = safeGet(KEYS.wallet, { coins: 0, diamonds: 0 });
  return {
    coins: Number.isFinite(w?.coins) ? w.coins : 0,
    diamonds: Number.isFinite(w?.diamonds) ? w.diamonds : 0,
  };
}

export function addCoins(n) {
  if (!Number.isFinite(n) || n === 0) return getWallet();
  const w = getWallet();
  w.coins = Math.max(0, w.coins + n);
  safeSet(KEYS.wallet, w);
  return w;
}

export function addDiamonds(n) {
  if (!Number.isFinite(n) || n === 0) return getWallet();
  const w = getWallet();
  w.diamonds = Math.max(0, w.diamonds + n);
  safeSet(KEYS.wallet, w);
  return w;
}

// === Best scores per level ===

function getAllBestScores() {
  const all = safeGet(KEYS.bestScores, {});
  return all && typeof all === 'object' ? all : {};
}

export function getBestScore(level) {
  const all = getAllBestScores();
  const v = all[level];
  return Number.isFinite(v) ? v : 0;
}

/** Zapisz score gdy pobił dotychczasowy. Zwraca { isNewRecord, oldScore }. */
export function setBestScore(level, score) {
  const all = getAllBestScores();
  const oldScore = Number.isFinite(all[level]) ? all[level] : 0;
  const isNewRecord = score > oldScore;
  if (isNewRecord) {
    all[level] = score;
    safeSet(KEYS.bestScores, all);
  }
  return { isNewRecord, oldScore };
}

/** Suma najlepszych runów per level — globalny ranking score. */
export function getRankingScore() {
  const all = getAllBestScores();
  return Object.values(all).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
}

// === Current level (najwyższy odblokowany) ===

export function getCurrentLevel() {
  const v = safeGet(KEYS.currentLevel, 1);
  return Number.isFinite(v) && v >= 1 ? Math.floor(v) : 1;
}

export function unlockLevel(n) {
  if (!Number.isFinite(n)) return;
  const cur = getCurrentLevel();
  if (n > cur) safeSet(KEYS.currentLevel, Math.floor(n));
}

// === Total runs (statystyka) ===

export function getTotalRuns() {
  const v = safeGet(KEYS.totalRuns, 0);
  return Number.isFinite(v) ? v : 0;
}

export function incrementTotalRuns() {
  const n = getTotalRuns() + 1;
  safeSet(KEYS.totalRuns, n);
  return n;
}

// === Last ranking score (cache do delta calcs jeśli potrzeba) ===

export function getLastRankingScore() {
  const v = safeGet(KEYS.lastRankingScore, 0);
  return Number.isFinite(v) ? v : 0;
}

export function setLastRankingScore(n) {
  if (!Number.isFinite(n)) return;
  safeSet(KEYS.lastRankingScore, Math.floor(n));
}
