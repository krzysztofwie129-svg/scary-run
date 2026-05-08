// PlayerStore — persystencja imienia gracza w localStorage między sesjami
// (sesja Persistent Name). Klucz osobny od save (P1), leaderboard, achievements,
// install-prompt. Na MenuScene "Czesc, KRZYSIEK!" + skip NameInputScene gdy
// imię już zapisane.

import { NAME_MAX_LENGTH } from '../config.js';

const STORAGE_KEY = 'scary_run_player_v1';

export const PlayerStore = {
  /** Sanitize imienia: uppercase, A-Z 0-9 spacja, max NAME_MAX_LENGTH. */
  sanitize(name) {
    if (typeof name !== 'string') return '';
    return name.toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .trim()
      .slice(0, NAME_MAX_LENGTH);
  },

  saveName(name) {
    const sanitized = this.sanitize(name);
    if (!sanitized) return false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        name: sanitized,
        savedAt: Date.now(),
      }));
      return true;
    } catch (e) {
      return false;
    }
  },

  /** Returns sanitized name or null. */
  getName() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data?.name) return null;
      const s = this.sanitize(data.name);
      return s || null;
    } catch (e) {
      return null;
    }
  },

  hasName() {
    return this.getName() !== null;
  },

  clearName() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
  },
};
