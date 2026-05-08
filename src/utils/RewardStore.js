// RewardStore — persystencja "pending reward" (chest reward który aktywuje się
// dopiero na starcie następnego levelu — magnet/shield/speed/double/giant/destroyer).
// localStorage key osobny od save/leaderboard/achievements/install/player.

const STORAGE_KEY = 'scary_run_pending_reward_v1';

export const RewardStore = {
  setPending(pending) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...pending,
        savedAt: Date.now(),
      }));
    } catch (e) { /* ignore */ }
  },

  getPending() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  clearPending() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
  },

  hasPending() {
    return this.getPending() !== null;
  },
};
