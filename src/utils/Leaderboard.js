// Leaderboard — globalny top 10 (sesja 7.4.6) przez Cloudflare Pages Function
// /api/leaderboard. Fallback localStorage gdy fetch fails (offline / dev /
// brak KV binding).
//
// API:
//   loadAsync() : Promise<Entry[]>          — fetch z /api/leaderboard
//   addAsync({name,score,level,coins}) : Promise<{rank, entries}>
//                                            — POST + zwraca rank (0-9) lub -1
//   formatDate(iso) : string                — DD.MM.YYYY
//
// Schema entry: { name, score, level, coins, date (ISO string) }.

import { LEADERBOARD_KEY, LEADERBOARD_MAX_ENTRIES } from '../config.js';

const API_URL = '/api/leaderboard';
const FETCH_TIMEOUT_MS = 4000;

export const Leaderboard = {
  // === Async API (preferowane — globalne) ===

  async loadAsync() {
    try {
      const res = await fetchWithTimeout(API_URL, { method: 'GET' }, FETCH_TIMEOUT_MS);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arr = await res.json();
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      console.warn('Leaderboard.loadAsync failed, fallback localStorage:', e?.message);
      return Leaderboard._loadLocal();
    }
  },

  /**
   * Wysyła wpis do globalnego leaderboardu. Zwraca { rank, entries }.
   * rank: 0-based pozycja w top 10, -1 jeśli nie zmieścił się.
   * Fallback: localStorage gdy serwer niedostępny (rank z lokalnego top 10).
   */
  async addAsync({ name, score, level, coins }) {
    const payload = { name, score, level, coins };
    try {
      const res = await fetchWithTimeout(
        API_URL,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
        FETCH_TIMEOUT_MS,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Synchronizuj localStorage cache ze świeżymi top 10 z serwera.
      if (Array.isArray(data.entries)) Leaderboard._saveLocal(data.entries);
      return { rank: data.rank ?? -1, entries: data.entries ?? [] };
    } catch (e) {
      console.warn('Leaderboard.addAsync failed, fallback localStorage:', e?.message);
      return Leaderboard._addLocal({ name, score, level, coins });
    }
  },

  formatDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.${d.getFullYear()}`;
  },

  // === Sync API (legacy — localStorage only) ===
  // Zachowane jeśli ktoś wywoła synchronicznie. Mniej użyteczne odkąd używamy
  // globalnego leaderboardu, ale graceful degradation.

  load() {
    return Leaderboard._loadLocal();
  },

  add(entry) {
    return Leaderboard._addLocal(entry).rank;
  },

  // === Internal helpers ===

  _loadLocal() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  },

  _saveLocal(entries) {
    try {
      localStorage.setItem(
        LEADERBOARD_KEY,
        JSON.stringify(entries.slice(0, LEADERBOARD_MAX_ENTRIES)),
      );
    } catch (e) { /* quota / private mode — silent */ }
  },

  _addLocal({ name, score, level, coins, date }) {
    const isoDate = date || new Date().toISOString();
    const entry = { name, score, level, coins, date: isoDate };
    const entries = Leaderboard._loadLocal();
    entries.push(entry);
    entries.sort((a, b) => b.score - a.score);
    // Dedup: jedno imię = jeden najwyższy wpis (analogicznie do backendu).
    const seen = new Set();
    const dedup = [];
    for (const e of entries) {
      if (!e || typeof e.name !== 'string') continue;
      if (seen.has(e.name)) continue;
      seen.add(e.name);
      dedup.push(e);
    }
    const top = dedup.slice(0, LEADERBOARD_MAX_ENTRIES);
    Leaderboard._saveLocal(top);
    const rank = top.findIndex((e) => e.name === name);
    return { rank, entries: top };
  },
};

function fetchWithTimeout(url, options, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}
