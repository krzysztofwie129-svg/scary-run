// playerStorage — async wrapper localStorage. Coins/diamonds delegowane do
// existing wallet (game_wallet) z utils/storage.js żeby nie duplikować źródła
// prawdy. Skin state ma własne klucze (scaryrun_owned_skins, scaryrun_equipped_skin).
//
// Funkcje są async (return Promise) żeby w przyszłości łatwo zamienić na fetch
// do backendu — caller już używa await.
//
// Pierwszy launch: jeśli brak `scaryrun_wallet_init_v1` flag → +50 diamentów
// startowy bonus (idempotent, raz na device).

import { getWallet, addCoins as walletAddCoins, addDiamonds as walletAddDiamonds } from '../utils/storage.js';
import { SKINS } from './skins.js';
import { POWERUPS } from './powerups.js';
import { markDirty } from '../utils/PlayerSync.js';

const VALID_SKIN_IDS = new Set(SKINS.map((s) => s.id));
const VALID_POWERUP_IDS = new Set(POWERUPS.map((p) => p.id));

const KEYS = {
  ownedSkins: 'scaryrun_owned_skins',
  equippedSkin: 'scaryrun_equipped_skin',
  initFlag: 'scaryrun_wallet_init_v1',
  ownedPowerups: 'scaryrun_owned_powerups',
  activePowerup: 'scaryrun_active_powerup',
};

// Per-module memory fallback dla iOS Safari Private mode (localStorage rzuca
// QuotaExceededError). Trzymamy reference-clear na consumePowerupSync etc.
const _memFallback = {};

const DEFAULT_OWNED = ['default'];
const DEFAULT_EQUIPPED = 'default';
const STARTER_DIAMONDS = 50;

let _initDone = false;

function ensureStarterBonus() {
  if (_initDone) return;
  _initDone = true;
  try {
    if (!localStorage.getItem(KEYS.initFlag)) {
      const w = getWallet();
      if (w.diamonds === 0) walletAddDiamonds(STARTER_DIAMONDS);
      localStorage.setItem(KEYS.initFlag, '1');
    }
  } catch (e) { /* private mode → no init */ }
}

function safeGetJSON(key, defaultVal) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultVal;
    const parsed = JSON.parse(raw);
    return parsed != null ? parsed : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function safeSetJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* ignore */ }
  // PlayerSync hybrid backup — debounced POST do CF KV po 2s.
  try { markDirty(); } catch (e) { /* ignore */ }
}

function safeRemove(key) {
  try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  delete _memFallback[key];
  try { markDirty(); } catch (e) { /* ignore */ }
}

// === Coins ===

export async function getCoins() {
  ensureStarterBonus();
  return getWallet().coins;
}

export async function setCoins(value) {
  ensureStarterBonus();
  const cur = getWallet().coins;
  const delta = Math.floor(value) - cur;
  if (delta !== 0) walletAddCoins(delta);
}

// === Diamonds ===

export async function getDiamonds() {
  ensureStarterBonus();
  return getWallet().diamonds;
}

export async function setDiamonds(value) {
  ensureStarterBonus();
  const cur = getWallet().diamonds;
  const delta = Math.floor(value) - cur;
  if (delta !== 0) walletAddDiamonds(delta);
}

// === Owned skins ===

export async function getOwnedSkins() {
  ensureStarterBonus();
  const list = safeGetJSON(KEYS.ownedSkins, DEFAULT_OWNED);
  if (!Array.isArray(list)) return [...DEFAULT_OWNED];
  // Default zawsze w środku, dedupe, filtruj martwe ID (po usunięciu skinów z SKINS).
  const set = new Set([...DEFAULT_OWNED, ...list.filter((id) => VALID_SKIN_IDS.has(id))]);
  return [...set];
}

export async function addOwnedSkin(skinId) {
  if (typeof skinId !== 'string' || !skinId) return;
  const owned = await getOwnedSkins();
  if (!owned.includes(skinId)) {
    owned.push(skinId);
    safeSetJSON(KEYS.ownedSkins, owned);
  }
}

// === Equipped skin ===

export async function getEquippedSkin() {
  ensureStarterBonus();
  const v = safeGetJSON(KEYS.equippedSkin, DEFAULT_EQUIPPED);
  // Fallback do default gdy zapisany skin został usunięty z SKINS.
  if (typeof v !== 'string' || !v || !VALID_SKIN_IDS.has(v)) {
    safeSetJSON(KEYS.equippedSkin, DEFAULT_EQUIPPED);
    return DEFAULT_EQUIPPED;
  }
  return v;
}

export async function setEquippedSkin(skinId) {
  if (typeof skinId !== 'string' || !skinId) return;
  safeSetJSON(KEYS.equippedSkin, skinId);
}

// === Power-ups (owned + active) ===

export async function getOwnedPowerups() {
  ensureStarterBonus();
  const raw = safeGetJSON(KEYS.ownedPowerups, {});
  const owned = (raw && typeof raw === 'object') ? raw : {};
  // Filtruj martwe ID + ensure non-negative number per valid id.
  const cleaned = {};
  for (const id of VALID_POWERUP_IDS) {
    const v = owned[id];
    cleaned[id] = (typeof v === 'number' && v >= 0) ? Math.floor(v) : 0;
  }
  return cleaned;
}

export async function addPowerup(id, count = 1) {
  if (!VALID_POWERUP_IDS.has(id)) return;
  const owned = await getOwnedPowerups();
  owned[id] = Math.max(0, (owned[id] || 0) + count);
  safeSetJSON(KEYS.ownedPowerups, owned);
}

/** -1 sztuka. Zwraca true gdy skonsumowano (gracz miał >=1), false gdy 0. */
export async function consumePowerup(id) {
  if (!VALID_POWERUP_IDS.has(id)) return false;
  const owned = await getOwnedPowerups();
  if ((owned[id] || 0) <= 0) return false;
  owned[id] -= 1;
  safeSetJSON(KEYS.ownedPowerups, owned);
  // Jeśli ostatnia sztuka tego active'a — wyczyść activePowerup.
  if (owned[id] === 0) {
    const activeId = safeGetJSON(KEYS.activePowerup, null);
    if (activeId === id) {
      safeRemove(KEYS.activePowerup);
    }
  }
  return true;
}

export async function getActivePowerup() {
  const id = safeGetJSON(KEYS.activePowerup, null);
  if (!id || !VALID_POWERUP_IDS.has(id)) return null;
  const owned = await getOwnedPowerups();
  if ((owned[id] || 0) <= 0) {
    safeRemove(KEYS.activePowerup);
    return null;
  }
  return id;
}

export async function setActivePowerup(id) {
  if (id === null || id === undefined) {
    safeRemove(KEYS.activePowerup);
    return;
  }
  if (!VALID_POWERUP_IDS.has(id)) return;
  const owned = await getOwnedPowerups();
  if ((owned[id] || 0) <= 0) return; // brak w inwentarzu
  safeSetJSON(KEYS.activePowerup, id);
}

/** Sync getter dla GameScene (create() nie jest async). */
export function getActivePowerupSync() {
  const id = safeGetJSON(KEYS.activePowerup, null);
  if (!id || !VALID_POWERUP_IDS.has(id)) return null;
  const raw = safeGetJSON(KEYS.ownedPowerups, {});
  const cnt = raw && typeof raw === 'object' ? (raw[id] || 0) : 0;
  return cnt > 0 ? id : null;
}

/** Sync consume dla GameScene. */
export function consumePowerupSync(id) {
  if (!VALID_POWERUP_IDS.has(id)) return false;
  const raw = safeGetJSON(KEYS.ownedPowerups, {});
  const owned = (raw && typeof raw === 'object') ? raw : {};
  const cnt = owned[id] || 0;
  if (cnt <= 0) return false;
  owned[id] = cnt - 1;
  safeSetJSON(KEYS.ownedPowerups, owned);
  if (owned[id] === 0) {
    const active = safeGetJSON(KEYS.activePowerup, null);
    if (active === id) {
      safeRemove(KEYS.activePowerup);
    }
  }
  return true;
}

/** Sync helper dla GameScene (nie chcę zmieniać create() na async). */
export function getEquippedSkinSync() {
  const v = safeGetJSON(KEYS.equippedSkin, DEFAULT_EQUIPPED);
  if (typeof v !== 'string' || !v || !VALID_SKIN_IDS.has(v)) {
    return DEFAULT_EQUIPPED;
  }
  return v;
}
