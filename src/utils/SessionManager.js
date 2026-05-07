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
    };
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
    this.currentPlayer().level++;
  }

  finishCurrentPlayer() {
    this.currentPlayer().finished = true;
  }

  /** Restart bieżącego gracza (po RESTART z GameOver w SP). */
  restartCurrentPlayer() {
    const p = this.currentPlayer();
    p.score = 0;
    p.coins = 0;
    p.diamonds = 0;
    p.lives = INITIAL_LIVES;
    p.finished = false;
    // level pozostaje (zostają na tym samym levelu)
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
}

export const sessionManager = new SessionManager();
