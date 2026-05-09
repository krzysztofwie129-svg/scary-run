// RewardManager — 10 nagród z chest po LevelComplete. Weighted random.
// Instant rewards (#1-4) aplikowane od razu przez applyInstantReward.
// Pending rewards (#5-10) zapisywane w RewardStore, applikowane na starcie
// następnego levelu (GameScene.applyPendingReward). Pole-name mapping
// dostosowane do naszego SessionManager: coins/diamonds/score (NIE totalCoins).

import { POWER_UP_TYPES } from './PowerUpManager.js';
import { addCoins, addDiamonds } from './storage.js';

export const REWARD_TYPES = {
  COINS_50:        'coins_50',
  DIAMONDS_5:      'diamonds_5',
  POINTS_200:      'points_200',
  // HEART removed (1 życie 1 szansa).
  NEXT_MAGNET:     'next_magnet',
  NEXT_SHIELD:     'next_shield',
  NEXT_SPEED:      'next_speed',
  NEXT_DOUBLE:     'next_double',
  NEXT_GIANT:      'next_giant',
  NEXT_DESTROYER:  'next_destroyer',
};

export const REWARDS = {
  [REWARD_TYPES.COINS_50]: {
    label: '+50 MONET', description: 'Bonus 500 punktów!',
    spriteKey: 'coin_00', spriteFallback: '🪙', color: 0xffd93c,
    weight: 25, instant: true,
  },
  [REWARD_TYPES.DIAMONDS_5]: {
    label: '+5 DIAMENTÓW', description: 'Bonus 60 punktów!',
    spriteKey: 'diamond', spriteFallback: '💎', color: 0x4ecdc4,
    weight: 20, instant: true,
  },
  [REWARD_TYPES.POINTS_200]: {
    label: '+200 PUNKTÓW', description: 'Score boost!',
    spriteKey: null, spriteFallback: '⭐', color: 0xffd93c,
    weight: 15, instant: true,
  },
  // HEART reward usunięty (1 życie 1 szansa — bonus życia bez efektu).
  [REWARD_TYPES.NEXT_MAGNET]: {
    label: 'MAGNES START', description: 'Nast. level z magnesem!',
    spriteKey: null, spriteFallback: '🧲', color: 0xff6b9d,
    weight: 8, instant: false,
    pendingPowerUp: POWER_UP_TYPES.MAGNET, duration: 10000,
  },
  [REWARD_TYPES.NEXT_SHIELD]: {
    label: 'TARCZA START', description: 'Nast. level z tarczą!',
    spriteKey: null, spriteFallback: '🛡️', color: 0x4ecdc4,
    weight: 6, instant: false,
    pendingPowerUp: POWER_UP_TYPES.SHIELD, duration: -1,
  },
  [REWARD_TYPES.NEXT_SPEED]: {
    label: 'TURBO START', description: 'Nast. level z turbo!',
    spriteKey: null, spriteFallback: '⚡', color: 0xffd93c,
    weight: 5, instant: false,
    pendingPowerUp: POWER_UP_TYPES.SPEED, duration: 5000,
  },
  [REWARD_TYPES.NEXT_DOUBLE]: {
    label: '2X MONETY START', description: 'Nast. level x2 monety!',
    spriteKey: null, spriteFallback: '💰', color: 0xb084ff,
    weight: 4, instant: false,
    pendingPowerUp: POWER_UP_TYPES.DOUBLE_COINS, duration: 15000,
  },
  [REWARD_TYPES.NEXT_GIANT]: {
    label: 'GIGANT', description: 'Postać +40% rozmiar!',
    spriteKey: null, spriteFallback: '🦣', color: 0xffa500,
    weight: 4, instant: false, pendingMod: 'giant',
  },
  [REWARD_TYPES.NEXT_DESTROYER]: {
    label: 'NISZCZYCIEL', description: 'Niszczy wszystkie przeszkody!',
    spriteKey: null, spriteFallback: '💥', color: 0xff3300,
    weight: 3, instant: false, pendingMod: 'destroyer',
  },
};

export const RewardManager = {
  /** Weighted random reward type. */
  randomReward() {
    const entries = Object.entries(REWARDS);
    const total = entries.reduce((s, [, r]) => s + r.weight, 0);
    let r = Math.random() * total;
    for (const [type, reward] of entries) {
      r -= reward.weight;
      if (r <= 0) return type;
    }
    return entries[0][0];
  },

  /** 3 niezależne losowania (mogą się powtarzać — to OK, daje dramę). */
  random3Rewards() {
    return [this.randomReward(), this.randomReward(), this.randomReward()];
  },

  /** Aplikuj instant reward (coins/diamonds/score/heart). Zwraca summary string lub null. */
  applyInstantReward(rewardType, sessionManager) {
    const reward = REWARDS[rewardType];
    if (!reward || !reward.instant) return null;
    const player = sessionManager.currentPlayer();
    if (!player) return null;

    switch (rewardType) {
      case REWARD_TYPES.COINS_50:
        player.coins = (player.coins || 0) + 50;
        player.score = (player.score || 0) + 500;
        addCoins(50); // persistent wallet — chest reward zostaje po śmierci.
        return '+50 monet, +500 pkt';
      case REWARD_TYPES.DIAMONDS_5:
        player.diamonds = (player.diamonds || 0) + 5;
        player.score = (player.score || 0) + 60;
        addDiamonds(5); // persistent wallet.
        return '+5 diam., +60 pkt';
      case REWARD_TYPES.POINTS_200:
        player.score = (player.score || 0) + 200;
        return '+200 pkt';
      // HEART case usunięty — reward type wycofany.
      default:
        return null;
    }
  },
};
