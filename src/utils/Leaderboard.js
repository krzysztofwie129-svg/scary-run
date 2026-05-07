// Leaderboard — top 10 wyników w localStorage.
// Schema entry: { name, score, level, coins, date (ISO string) }.

import { LEADERBOARD_KEY, LEADERBOARD_MAX_ENTRIES } from '../config.js';

export const Leaderboard = {
  load() {
    try {
      const raw = localStorage.getItem(LEADERBOARD_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  },

  save(entries) {
    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries.slice(0, LEADERBOARD_MAX_ENTRIES)));
    } catch (e) { /* quota exceeded etc. — silent fail */ }
  },

  /**
   * Dodaje wpis i zwraca rank (0-based) w top 10. -1 jeśli nie zmieścił się.
   */
  add({ name, score, level, coins, date }) {
    const isoDate = date || new Date().toISOString();
    const entry = { name, score, level, coins, date: isoDate };
    const entries = Leaderboard.load();
    entries.push(entry);
    entries.sort((a, b) => b.score - a.score);
    const top = entries.slice(0, LEADERBOARD_MAX_ENTRIES);
    Leaderboard.save(top);
    return top.findIndex((e) => e.name === name && e.score === score && e.date === isoDate);
  },

  formatDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}.${mm}.${d.getFullYear()}`;
  },
};
