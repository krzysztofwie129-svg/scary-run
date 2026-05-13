// GameStateStore — persystencja stanu gry (sesja P1).
// localStorage 'scary_run_save_v1' + CF KV backup przez PlayerSync.markDirty().
// State zawiera serialized sessionManager + currentLevel. TTL 24h lokalnie,
// KV nieograniczony — claim code recovery przywraca save na nowym urządzeniu.
//
// 2026-05-13: dodane markDirty() po save/clear. Wcześniej GameStateStore używał
// raw localStorage.setItem/removeItem BEZ wywołania PlayerSync — save_v1 trafiał
// do KV tylko incydentalnie (gdy INNY safeSet z storage.js wywoływał markDirty
// który zbiera cały snapshot). Po clear lokalnym KV mogło mieć stale save_v1 (good)
// LUB inny safeSet POSTował snapshot bez save_v1 (bad — utrata progresu). Teraz
// save i clear deterministycznie trigger sync do KV.

import { markDirty } from './PlayerSync.js';

const STORAGE_KEY = 'scary_run_save_v1';
// 2026-05-13: TTL 24h → 30 dni. Wcześniej save expirował po 24h przerwy →
// gracz odpalający grę po dniu wracał na L1. Plus przy claim code recovery
// snapshot z KV mógł mieć timestamp >24h temu (jeśli gracz nie grał kilka dni)
// → load() return null → utrata progresu. Reset progresu tylko w Settings.
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const GameStateStore = {
  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...state,
        timestamp: Date.now(),
      }));
      markDirty();
    } catch (e) {
      // quota exceeded / private mode — silent fail (UI nie pokazuje "save failed")
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - (data.timestamp || 0) > TTL_MS) {
        // 2026-05-13: TTL-expiry — clear LOKALNIE bez markDirty (NIE nadpisuj KV).
        // Bez tego: gracz wraca po 30+ dniach → load() expire → clear({propagate})
        // → POST snapshot bez save_v1 do KV (LWW akceptuje nowsze ts) → save w KV
        // trwale utracony nawet jeśli claim code restore by go odzyskał.
        try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  },

  clear() {
    // Świadome user-clear (np z MenuScene play action, ResetGame, DeathScene._restart).
    // Propaguje do KV przez markDirty → snapshot bez save_v1 → KV usuwa stale state.
    try {
      localStorage.removeItem(STORAGE_KEY);
      markDirty();
    } catch (e) { /* ignore */ }
  },

  hasSave() {
    return GameStateStore.load() !== null;
  },
};
