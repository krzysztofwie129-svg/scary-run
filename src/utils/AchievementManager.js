// AchievementManager — tracking 15 achievementów (sesja 10). Persistence
// w localStorage pod kluczem osobnym od save/leaderboard/install.
// Unlock = jednorazowy: gdy raz zdobyte, zostaje na zawsze (nawet po
// game over / reset session). Toast pokazywany tylko przy świeżym unlock.

const STORAGE_KEY = 'scary_run_achievements_v1';

const ACHIEVEMENTS = [
  { id: 'coins_50',          title: 'First 50 coins!',     icon: '🪙' },
  { id: 'coins_100',         title: 'Centenarian',         icon: '🪙' },
  { id: 'coins_250',         title: 'Coin Collector',      icon: '💰' },
  { id: 'diamonds_5',        title: 'Diamond Hunter',      icon: '💎' },
  { id: 'diamonds_25',       title: 'Diamond King',        icon: '💎' },
  { id: 'perfect_run',       title: 'Perfect Run!',        icon: '⭐' },
  { id: 'triple_perfect',    title: 'Triple Perfect',      icon: '⭐⭐⭐' },
  { id: 'speedster',         title: 'Speedster',           icon: '🏃' },
  { id: 'no_damage_master',  title: 'No Damage Master',    icon: '🎯' },
  { id: 'first_level',       title: 'First Step',          icon: '🏁' },
  { id: 'halfway',           title: 'Halfway There',       icon: '🏁' },
  { id: 'champion',          title: 'Champion!',           icon: '👑' },
  { id: 'hellfire_survivor', title: 'Hellfire Survivor',   icon: '🔥' },
  { id: 'dragon_slayer',     title: 'Dragon Slayer',       icon: '🐉' },
  { id: 'high_scorer',       title: 'High Scorer',         icon: '💯' },
];

export const AchievementManager = {
  ACHIEVEMENTS,

  loadUnlocked() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  saveUnlocked(arr) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch (e) { /* ignore */ }
  },

  isUnlocked(id) {
    return this.loadUnlocked().includes(id);
  },

  unlock(id) {
    const unlocked = this.loadUnlocked();
    if (unlocked.includes(id)) return null;
    unlocked.push(id);
    this.saveUnlocked(unlocked);
    return ACHIEVEMENTS.find((a) => a.id === id);
  },

  /**
   * Sprawdza wszystkie achievementy. Zwraca tablicę nowo unlocked
   * (już skutecznie zapisane w localStorage).
   */
  checkAll(stats) {
    const conditions = {
      coins_50:          () => stats.totalCoinsLifetime >= 50,
      coins_100:         () => stats.totalCoinsLifetime >= 100,
      coins_250:         () => stats.totalCoinsLifetime >= 250,
      diamonds_5:        () => stats.diamondsThisLevel >= 5,
      diamonds_25:       () => stats.totalDiamondsLifetime >= 25,
      perfect_run:       () => stats.deathsThisLevel === 0,
      triple_perfect:    () => stats.consecutivePerfectLevels >= 3,
      speedster:         () => stats.timeRemainingPercent >= 0.5,
      no_damage_master:  () => stats.gameCompletedNoDeaths === true,
      first_level:       () => stats.currentLevel >= 1,
      halfway:           () => stats.currentLevel >= 6,
      champion:          () => stats.currentLevel >= 11 && stats.gameComplete === true,
      hellfire_survivor: () => stats.currentLevel >= 7,
      dragon_slayer:     () => stats.currentLevel >= 11,
      high_scorer:       () => stats.scoreThisLevel >= 5000,
    };

    const newlyUnlocked = [];
    const alreadyUnlocked = new Set(this.loadUnlocked());

    for (const ach of ACHIEVEMENTS) {
      if (alreadyUnlocked.has(ach.id)) continue;
      const cond = conditions[ach.id];
      if (cond && cond()) {
        const u = this.unlock(ach.id);
        if (u) newlyUnlocked.push(u);
      }
    }

    return newlyUnlocked;
  },

  /** Reset (debug). NIE wywoływać w runtime. */
  resetAll() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
  },
};
