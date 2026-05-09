// ScoreSystem — finalizacja run score = base × level_number.
//
// Base score akumuluje się przez sessionManager.currentPlayer().score (legacy),
// ale ScoreSystem zapewnia spójną finalizację dla rankingu (multiplier per level).
//
// Composition of base_score (incremental):
//   - coin pickup:   +10 (×2 podczas DOUBLE_COINS)
//   - diamond:       +12
//   - survival:      +10/sek (real-time delta)
//   - boss victory:  +500
//   - chest score bonuses: +500 / +60 / +200

import { sessionManager } from '../utils/SessionManager.js';

export const ScoreSystem = {
  /** Zwraca base score (sum bez multiplier'a). */
  getBaseScore() {
    return Math.floor(sessionManager.currentPlayer()?.score || 0);
  },

  /** Base score TEGO levelu (delta od levelStartScore). */
  getLevelBaseScore(levelStartScore) {
    const total = this.getBaseScore();
    const start = Number.isFinite(levelStartScore) ? Math.floor(levelStartScore) : 0;
    return Math.max(0, total - start);
  },

  /** Final run score = (current level's base) × level_number (1-based).
   *  Jeśli levelStartScore podany — liczy delta tylko tego levelu (nie cumulative). */
  finalizeRunScore(levelNumber, levelStartScore) {
    const base = Number.isFinite(levelStartScore)
      ? this.getLevelBaseScore(levelStartScore)
      : this.getBaseScore();
    const lvl = Math.max(1, Math.floor(levelNumber || 1));
    return Math.floor(base * lvl);
  },
};
