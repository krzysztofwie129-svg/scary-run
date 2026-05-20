// PlayerSync — hybrid backup localStorage → Cloudflare KV.
// Strategia: localStorage = primary, backend = backup co 2s (debounced).
// Konflikt resolution: newer ts wygrywa (last-write-wins).

import { DeviceId } from './DeviceId.js';
import { apiUrl } from './apiBase.js';

const API_URL = apiUrl('/api/player');
const DEBOUNCE_MS = 2000;
const TS_KEY = 'scaryrun_sync_ts';

// Klucze localStorage które bekapujemy (snapshot).
// 2026-05-13: dodano scary_run_player_v1 (imię gracza). Wcześniej imię siedziało
// TYLKO w scary_run_save_v1 → po claim code restore na nowym urządzeniu lub po
// reset save_v1 user musiał ponownie wpisać imię (NameInputScene). Teraz imię
// w snapshot KV — restoreowane razem z resztą profilu.
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
  'scary_run_player_v1',
  // 2026-05-13: achievements + pending reward — gracz tracił unlocked osiągnięcia
  // przy claim code restore na nowym urządzeniu.
  'scary_run_achievements_v1',
  'scary_run_pending_reward_v1',
  // 2026-05-13: claim code — gdy user wyczyści cache lokalnie, claim recovery
  // odzyskuje deviceId + claim code z snapshot zamiast generować nowy.
  'scaryrun_my_code',
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
      // 2026-05-13: 413 (snapshot too large) — sygnał że bestScores/achievements
      // wyrosły poza MAX_SIZE_BYTES (64KB). User nie zobaczy, ale backupy
      // przestają działać → Sentry warn.
      if (response.status === 413) {
        console.error('[PlayerSync] 413 snapshot too large — backupy się wyłączyły');
      } else if (response.status >= 500) {
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

/** 2026-05-13: cancel pending debounce. Wołane w restoreFromCode przed deviceId
 *  swap żeby pending POST nie wystrzelił z OLD localStorage pod NEW deviceId. */
export function cancelPendingSync() {
  if (_debounceTimer) {
    clearTimeout(_debounceTimer);
    _debounceTimer = null;
  }
}

// 2026-05-13: pagehide flush via sendBeacon — user zamykajacy tab w <2s po
// zakupie skinu/wpisie wagi mógł stracić sync do KV. sendBeacon gwarantuje
// POST nawet po unload.
if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
  window.addEventListener('pagehide', () => {
    if (!_debounceTimer) return;
    clearTimeout(_debounceTimer);
    _debounceTimer = null;
    try {
      const deviceId = DeviceId.get();
      if (!deviceId) return;
      const body = JSON.stringify({ deviceId, snapshot: buildSnapshot(), ts: Date.now() });
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(API_URL, blob);
    } catch (_) { /* ignore */ }
  });
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

    // Offline guard — bez tego fetch wisi w native iOS aż DNS/TCP timeoutuje
    // (kilka sekund) zamiast natychmiast zwrócić. BootScene już ma 1s race,
    // ale ten skip jest dodatkowo szybszy + zapobiega niepotrzebnemu fetch.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

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
    // 2026-05-13: DESTRUCTIVE restore — KV jest source of truth. Lokalne klucze
    // które NIE są w snapshot muszą być usuwane, inaczej stale save_v1
    // (z poprzedniej sesji) zostaje w localStorage i menu pokazuje KONTYNUUJ
    // do starego stanu zamiast czystego startu (Krzysztof L2 case).
    for (const key of SYNCED_KEYS) {
      try {
        if (key in result.snapshot) {
          localStorage.setItem(key, result.snapshot[key]);
        } else {
          localStorage.removeItem(key);
        }
      } catch (e) { /* ignore quota */ }
    }
    setLocalTs(result.ts);
  } catch (e) {
    console.warn('[PlayerSync] initial load error:', e?.message);
  }
}
