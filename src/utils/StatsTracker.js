// StatsTracker — fire-and-forget POST analitycznych eventów na /api/stats.
// Anonim deviceId + minimal payload. Failures silent (offline OK).
//
// Events:
//   gameStart       — start nowej gry (po char select)
//   levelStart      — wejście do GameScene dla danego level (incl. restarts)
//   levelComplete   — przekroczenie mety (handleFinishLineCrossed)
//   bossSkip        — pominięcie boss fight (BossChoiceScene SKIP)
//   bossWin         — pokonanie bossa (BossFight handleVictory)
//   bossDefeat      — przegrana z bossem (BossFight handleDefeat)
//   gameOver        — utrata wszystkich żyć (GameOverScene)
//   gameComplete    — ukończenie L11 (GameCompleteScene)

import { DeviceId } from './DeviceId.js';

const API_URL = '/api/stats';
const TIMEOUT_MS = 3000;

export const StatsTracker = {
  /** Fire-and-forget. Nie blokuje UI, errors swallow. */
  track(event, payload = {}) {
    try {
      const body = JSON.stringify({
        deviceId: DeviceId.get(),
        event,
        payload,
        ts: Date.now(),
      });
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: ctrl.signal,
        keepalive: true, // pozwala żeby request poszedł nawet jak scena się zmienia
      }).catch(() => { /* ignore network errors */ })
        .finally(() => clearTimeout(timer));
    } catch (e) {
      // ignore
    }
  },
};
