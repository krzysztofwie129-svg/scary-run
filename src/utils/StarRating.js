// StarRating — kalkulacja gwiazdek dla LevelComplete (sesja 10).
// 0 deaths → 3 stars, 1 death → 2 stars, 2 deaths → 1 star.
// 3+ deaths nie powinno wystąpić (game over przy lives=0 → GameOverScene).

export const StarRating = {
  calculate(deathsThisLevel) {
    if (deathsThisLevel <= 0) return 3;
    if (deathsThisLevel === 1) return 2;
    return 1;
  },

  motivationFor(stars) {
    const messages = {
      3: ['👑 MISTRZOWSKO!', '⭐ Bezbłędnie!', '🌟 Perfekcyjnie!'],
      2: ['🔥 Świetnie!', '💯 Bardzo dobrze!', '👍 Tak trzymaj!'],
      1: ['💪 Dobra robota!', '👊 Dasz radę więcej!', '🎯 Jeszcze raz?'],
    };
    const arr = messages[stars] || messages[1];
    return arr[Math.floor(Math.random() * arr.length)];
  },
};
