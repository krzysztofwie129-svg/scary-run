// PlayerSync — hybrid backup localStorage → Cloudflare KV.
// Strategia: localStorage = primary, backend = backup co 2s (debounced).
// Konflikt resolution: newer ts wygrywa (last-write-wins).

import { DeviceId } from './DeviceId.js';

const API_URL = '/api/player';
const DEBOUNCE_MS = 2000;
const TS_KEY = 'scaryrun_sync_ts';

// Klucze localStorage które bekapujemy (snapshot).
const SYNCED_KEYS = [
  'game_wallet',
  'game_bestScores',
  'game_currentLevel',
  'game_totalRuns',
  'game_lastRankingScore',
  'scaryrun_owned_skins',
  'scaryrun_equipped_skin',
  'scaryrun_owned_powerups',
  'scaryrun_active_powerup',
  'scaryrun_wallet_init_v1',
  'scary_run_save_v1',
];

let _debounceTimer = null;

function buildSnapshot() {
  const snapshot = {};
  for (const key of SYNCED_KEYS) {
    try {
      const v = localStorage.getItem(key);
      if (v != null) snapshot[key] = v;
    } catch (e) { /* ignore */ }
  }
  return snapshot;
}

function getLocalTs() {
  try {
    const v = localStorage.getItem(TS_KEY);
    return v ? parseInt(v, 10) : 0;
  } catch (e) { return 0; }
}

function setLocalTs(ts) {
  try {
    localStorage.setItem(TS_KEY, String(ts));
  } catch (e) { /* ignore */ }
}

async function _postSnapshot() {
  try {
    const deviceId = DeviceId.get();
    if (!deviceId) return;

    const snapshot = buildSnapshot();
    const ts = Date.now();

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, snapshot, ts }),
    });

    if (!response.ok) {
      if (response.status >= 500) {
        console.warn('[PlayerSync] POST failed:', response.status);
      }
      return;
    }

    const result = await response.json();
    if (result.accepted) {
      setLocalTs(ts);
    }
  } catch (e) {
    // Network error — nie raportuj do Sentry (offline / network glitch normalny).
    console.warn('[PlayerSync] post error:', e?.message);
  }
}

/** Wołane po każdej zmianie localStorage. Debounce 2s, potem POST. */
export function markDirty() {
  if (_debounceTimer) clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    _debounceTimer = null;
    _postSnapshot();
  }, DEBOUNCE_MS);
}

/**
 * Wołane raz przy starcie gry.
 * Pobiera snapshot z backendu, jeśli newer niż local — restoruje.
 * Jeśli network error / brak danych — fallback do local (nic nie robimy).
 */
export async function initialLoad() {
  try {
    const deviceId = DeviceId.get();
    if (!deviceId) return;

    const response = await fetch(`${API_URL}?deviceId=${encodeURIComponent(deviceId)}`, {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status >= 500) {
        console.warn('[PlayerSync] GET failed:', response.status);
      }
      return;
    }

    const result = await response.json();
    if (!result.snapshot || !result.ts) {
      console.log('[PlayerSync] brak backupu w backendzie, używam local');
      return;
    }

    const localTs = getLocalTs();
    if (result.ts <= localTs) {
      console.log('[PlayerSync] local jest nowszy niż backend, nie restoruj');
      return;
    }

    console.log('[PlayerSync] restoruje z backendu, ts:', result.ts);
    for (const [key, value] of Object.entries(result.snapshot)) {
      try {
        if (SYNCED_KEYS.includes(key)) {
          localStorage.setItem(key, value);
        }
      } catch (e) { /* ignore quota */ }
    }
    setLocalTs(result.ts);
  } catch (e) {
    console.warn('[PlayerSync] initial load error:', e?.message);
  }
}
