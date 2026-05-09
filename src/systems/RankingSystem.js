// RankingSystem — best run per level + suma jako ranking_score.
//
// Po każdym ukończonym/zakończonym levelu:
//   recordRun(level, runScore) → zwraca { isNewRecord, oldScore, runScore, delta, rankingScore }.
//
// ranking_score = SUMA najlepszych run_score z każdego levelu.

import {
  getBestScore,
  setBestScore,
  getRankingScore,
  unlockLevel,
  incrementTotalRuns,
  getLastRankingScore,
  setLastRankingScore,
} from '../utils/storage.js';

export const RankingSystem = {
  /**
   * Rejestruje run dla danego levelu. Aktualizuje bestScore jeśli pobity.
   * Zwraca pełny snapshot do wyświetlenia w DeathScene/LevelComplete.
   */
  recordRun(levelNumber, runScore) {
    const lvl = Math.max(1, Math.floor(levelNumber || 1));
    const score = Math.max(0, Math.floor(runScore || 0));
    const prevRanking = getRankingScore();
    const { isNewRecord, oldScore } = setBestScore(lvl, score);
    const rankingScore = getRankingScore();
    setLastRankingScore(rankingScore);
    return {
      level: lvl,
      runScore: score,
      isNewRecord,
      oldScore,
      delta: isNewRecord ? score - oldScore : 0,
      rankingScore,
      rankingDelta: rankingScore - prevRanking,
    };
  },

  /** Increment total runs (wywołać raz per attempt na zakończenie). */
  endRun() {
    return incrementTotalRuns();
  },

  /** Odblokuj level (wywołać po ukończeniu lub osiągnięciu). */
  unlock(levelNumber) {
    unlockLevel(levelNumber);
  },

  getBestScore,
  getRankingScore,
  getPreviousRankingScore: getLastRankingScore,
};
