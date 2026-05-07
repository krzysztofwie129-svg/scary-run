// SessionManager — globalny state sesji multiplayer (singleton).
// Trzyma listę graczy + aktualny index. Wszystkie sceny czytają stan stąd
// zamiast przekazywać przez data scene.start (czytelniej dla MP flow).
//
// Dlaczego singleton zamiast scene data?
// MP ma 4 graczy, każdy gra wszystkie 4 levele osobno. Przekazywanie tego
// przez init data oznaczałoby propagację dużego obiektu przez każdą scenę,
// łatwo zgubić, łatwo nadpisać. Singleton + reset() jasno definiuje
// punkty resetu (nowa gra z menu).

import {
  INITIAL_LIVES,
  MAX_LIVES,
  COINS_PER_EXTRA_LIFE,
  COIN_SCORE,
  DIAMOND_SCORE,
} from '../config.js';

class SessionManager {
  constructor() {
    this.reset();
  }

  reset() {
    this.players = []; // [{ name, character, score, coins, diamonds, level, lives, finished }]
    this.currentPlayerIndex = 0;
    this.numPlayers = 1;
    this.isMultiplayer = false;
  }

  setupSinglePlayer(name = '') {
    this.reset();
    this.numPlayers = 1;
    this.isMultiplayer = false;
    this.players = [this.makePlayer(name)];
  }

  setupMultiplayer(numPlayers) {
    this.reset();
    this.numPlayers = numPlayers;
    this.isMultiplayer = numPlayers > 1;
    this.players = Array.from({ length: numPlayers }, () => this.makePlayer(''));
  }

  makePlayer(name) {
    return {
      name,
      character: null,
      score: 0,
      coins: 0,
      diamonds: 0,
      level: 0,        // 0-based index
      lives: INITIAL_LIVES,
      finished: false,
      // Sesja 10 — stats per-level + streak dla star rating + achievements.
      consecutivePerfectLevels: 0,
      // Snapshot przy starcie levelu (żeby liczyć delta coins/diamonds/score
      // zebrane W TYM levelu — używane przez LevelComplete dla counter anim
      // i achievements typu "5 diamonds in one level").
      levelStartSnapshot: { coins: 0, diamonds: 0, score: 0 },
      // Counter resetowany przy starcie levelu, increment per loseLife.
      deathsThisLevel: 0,
    };
  }

  /** Sesja 10 — wywoływane przy startup levelu (init() w GameScene).
   *  Idempotentne per level: snapshot + deathsThisLevel reset robi się
   *  TYLKO gdy gracz świeżo wszedł na ten level (advanceLevel zwiększyło).
   *  Scene.restart() po stracie życia też woła to, ale bez efektu — deaths
   *  akumulowane między restartami żeby star rating był poprawny. */
  startLevel() {
    const p = this.currentPlayer();
    if (!p) return;
    if (p._snapshotForLevel === p.level) return; // już snapshotted dla tego levelu
    p._snapshotForLevel = p.level;
    p.levelStartSnapshot = {
      coins: p.coins,
      diamonds: p.diamonds,
      score: p.score,
    };
    p.deathsThisLevel = 0;
  }

  setName(playerIndex, name) {
    if (this.players[playerIndex]) this.players[playerIndex].name = name;
  }

  currentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  setCharacter(charKey) {
    this.currentPlayer().character = charKey;
  }

  /** Strata życia. Zwraca true jeśli graczowi skończyły się życia. */
  loseLife() {
    const p = this.currentPlayer();
    p.lives = Math.max(0, p.lives - 1);
    p.deathsThisLevel = (p.deathsThisLevel || 0) + 1;
    p.consecutivePerfectLevels = 0; // reset streak
    return p.lives <= 0;
  }

  /**
   * Dodaje monetę do bieżącego gracza. Zwraca { extraLife: bool } —
   * extraLife=true gdy zebrano milestone (co COINS_PER_EXTRA_LIFE) i lives < MAX_LIVES.
   */
  addCoin() {
    const p = this.currentPlayer();
    p.coins++;
    p.score += COIN_SCORE;
    if (p.coins % COINS_PER_EXTRA_LIFE === 0 && p.lives < MAX_LIVES) {
      p.lives++;
      return { extraLife: true };
    }
    return { extraLife: false };
  }

  addDiamond() {
    const p = this.currentPlayer();
    p.diamonds++;
    p.score += DIAMOND_SCORE;
  }

  addSurvivalScore(points) {
    this.currentPlayer().score += points;
  }

  advanceLevel() {
    const p = this.currentPlayer();
    // Sesja 10: jeśli gracz nie zginął w ukończonym levelu, increment streaku.
    if ((p.deathsThisLevel || 0) === 0) {
      p.consecutivePerfectLevels = (p.consecutivePerfectLevels || 0) + 1;
    }
    p.level++;
  }

  finishCurrentPlayer() {
    this.currentPlayer().finished = true;
  }

  /** Restart bieżącego gracza (po RESTART z GameOver w SP).
   *  level pozostaje — zostaje na tym samym poziomie. (Zachowane dla
   *  scenariusza re-try konkretnego levelu jeśli kiedyś będzie potrzebne.) */
  restartCurrentPlayer() {
    const p = this.currentPlayer();
    p.score = 0;
    p.coins = 0;
    p.diamonds = 0;
    p.lives = INITIAL_LIVES;
    p.finished = false;
  }

  /** Pełen restart bieżącego gracza — RESET DO LEVELU 0.
   *  Używany przez GameOverScene RESTART po stracie wszystkich żyć.
   *  Postać (character) pozostaje — gracz i postać te same. */
  restartCurrentPlayerFromLevel0() {
    const p = this.currentPlayer();
    p.score = 0;
    p.coins = 0;
    p.diamonds = 0;
    p.level = 0;
    p.lives = INITIAL_LIVES;
    p.finished = false;
  }

  hasNextPlayer() {
    return this.currentPlayerIndex < this.players.length - 1;
  }

  nextPlayer() {
    if (this.hasNextPlayer()) {
      this.currentPlayerIndex++;
      return true;
    }
    return false;
  }

  allFinished() {
    return this.players.every((p) => p.finished);
  }

  getResultsSorted() {
    return [...this.players].sort((a, b) => b.score - a.score);
  }

  // === Sesja P1: serialize / deserialize do GameStateStore ===

  serialize() {
    return {
      players: this.players,
      currentPlayerIndex: this.currentPlayerIndex,
      numPlayers: this.numPlayers,
      isMultiplayer: this.isMultiplayer,
    };
  }

  /** Returns true on success, false jeśli data malformed. */
  deserialize(data) {
    if (!data || !Array.isArray(data.players)) return false;
    this.players = data.players;
    this.currentPlayerIndex = data.currentPlayerIndex || 0;
    this.numPlayers = data.numPlayers || data.players.length;
    this.isMultiplayer = !!data.isMultiplayer;
    return true;
  }
}

export const sessionManager = new SessionManager();
