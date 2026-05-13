// DeathScene — ornate frame asset BG + dynamic text overlay + invisible click zones
// nad baked buttons (ZAGRAJ PONOWNIE / SKLEP / RANKING).
//
// Asset: death_screen_bg.webp (source 1672×941 ChatGPT mockup, 1.776:1 ratio).
// Game canvas 1280×720 (1.778:1) — display setDisplaySize(1280, 720), brak distort.
//
// Pola dynamiczne (per spec):
//   txt_first_time / txt_level — top message (NEW badge + nagłówek)
//   txt_score                  — duże [SCORE] pkt
//   txt_best_score             — rekord: [BEST_SCORE] (linia kontekst)
//   txt_coins / txt_diamonds   — wallet delta pill
//   txt_ranking_title          — Ranking Total
//   txt_ranking_prev           — [RANKING_PREV]
//   txt_ranking_new            — [RANKING_NEW] (animowany count-up)
//
// Fonty (z index.html Google Fonts):
//   Luckiest Guy   — nagłówki/tytuły
//   Baloo 2 800    — duże liczby
//   Montserrat 800 — przyciski (CTA)
//   Nunito Sans 600 — small text UI

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { sessionManager } from '../utils/SessionManager.js';
import { Leaderboard } from '../utils/Leaderboard.js';
import { GameStateStore } from '../utils/GameStateStore.js';

const FONT_TITLE = '"Luckiest Guy", "Bangers", "Arial Black", sans-serif';
const FONT_BIG = '"Baloo 2", "Fredoka", "Arial Black", sans-serif';
const FONT_CTA = '"Montserrat", "Arial Black", sans-serif';
const FONT_UI = '"Nunito Sans", "Arial", sans-serif';

export class DeathScene extends Phaser.Scene {
  constructor() {
    super({ key: 'DeathScene' });
  }

  init(data) {
    const runScore = data?.runScore || 0;
    const oldScore = data?.oldScore || 0;
    const isNewRecord = !!data?.isNewRecord;
    const rankingScore = data?.rankingScore || 0;
    const delta = data?.delta || 0;

    this.payload = {
      level: data?.level || 1,
      runScore,
      isNewRecord,
      oldScore,
      delta,
      rankingScore,
      coinsGained: data?.coinsGained || 0,
      diamondsGained: data?.diamondsGained || 0,
      context: data?.context === 'boss' ? 'boss' : 'level',
      fromLevel: data?.fromLevel || (data?.level || 1),
      sceneData: data?.sceneData || {},
    };
    this.payload.previousRankingTotal = Math.max(0, rankingScore - delta);
    this.payload.newRankingTotal = rankingScore;
    this.payload.rankingDelta = rankingScore - this.payload.previousRankingTotal;
    this.payload.isFirstTime = isNewRecord && oldScore === 0;
    this.payload.isCloseMiss = !isNewRecord && oldScore > 0 && runScore >= 0.8 * oldScore;
    // bestScoreToShow: po setBestScore w GameScene/BossFight, getBestScore zwraca
    // max(oldScore, runScore). Używamy oldScore — to wartość PRZED tym runem.
    this.payload.bestScoreToShow = Math.max(oldScore, runScore);
  }

  create() {
    const cx = GAME_WIDTH / 2;

    // Background full-canvas asset (frame + baked buttons + placeholder text).
    if (this.textures.exists('death_screen_bg')) {
      this.add.image(cx, GAME_HEIGHT / 2, 'death_screen_bg').setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(0);
    } else {
      this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a0a2e).setDepth(0);
    }
    this._duckMusic();

    // Submit do globalnego leaderboardu — fire-and-forget. W "1 życie 1 szansa"
    // każda śmierć/boss-defeat ląduje tu (NIE w GameOverScene), więc to JEDYNE
    // miejsce gdzie wyniki idą do top 50.
    this._submitLeaderboard();

    // WRÓĆ button (lewy górny) → MenuScene. Ten sam asset co w ShopScene.
    if (this.textures.exists('shop_btn_back')) {
      const back = this.add.image(110, 50, 'shop_btn_back')
        .setDisplaySize(180, 60)
        .setDepth(99999)
        .setInteractive({ useHandCursor: true });
      back.on('pointerover', () => back.setScale(back.scaleX * 1.05, back.scaleY * 1.05));
      back.on('pointerout', () => back.setScale(back.scaleX / 1.05, back.scaleY / 1.05));
      back.on('pointerup', () => {
        this._restoreMusic();
        this.scene.start('MenuScene');
      });
    }

    // === Text overlay positions (regiony wyczyszczone z placeholder'ów w asset) ===
    const yTop = 134;
    const yScore = 225;
    const yBestScore = 285;
    const yCoinsDiamonds = 320;
    const yRankingTitle = 380;
    const yRankingValue = 430;

    // === Top message (NEW badge + nagłówek) ===
    const topMsg = this._buildTopMessage();
    if (topMsg.showBadge) {
      // NEW badge — niebieski oval z tekstem "NEW".
      const badgeBg = this.add.rectangle(cx - 230, yTop, 76, 38, 0x4ea7ff, 0.95).setStrokeStyle(2, 0xffffff).setDepth(2);
      const badgeText = this.add.text(cx - 230, yTop, 'NEW', {
        fontFamily: FONT_CTA,
        fontSize: '20px',
        color: '#ffffff',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(3);
      badgeBg.setAlpha(0); badgeText.setAlpha(0);
      this.tweens.add({ targets: [badgeBg, badgeText], alpha: 1, duration: 400, delay: 1000 });
    }
    const topText = this.add.text(cx + (topMsg.showBadge ? 30 : 0), yTop, topMsg.text, {
      fontFamily: FONT_TITLE,
      fontSize: '34px',
      color: topMsg.color,
      stroke: '#000',
      strokeThickness: 5,
      align: 'center',
    }).setOrigin(0.5).setDepth(3).setAlpha(0);
    this.tweens.add({ targets: topText, alpha: 1, duration: 400, delay: 1000 });

    // === Run score (BIG) ===
    const scoreText = this.add.text(cx, yScore, '0 pkt', {
      fontFamily: FONT_BIG,
      fontSize: '74px',
      fontStyle: '800',
      color: '#ffd93c',
      stroke: '#3a1d5a',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(3).setAlpha(0);
    this.time.delayedCall(500, () => {
      scoreText.setAlpha(1);
      const counter = { v: 0 };
      this.tweens.add({
        targets: counter,
        v: this.payload.runScore,
        duration: 600,
        ease: 'Cubic.easeOut',
        onUpdate: () => scoreText.setText(`${Math.floor(counter.v)} pkt`),
      });
    });

    // === Best score line (rekord: X) — pokazany gdy oldScore > 0 ===
    if (this.payload.oldScore > 0 && !this.payload.isFirstTime) {
      const bestLabel = this.payload.isNewRecord
        ? `poprzedni: ${this.payload.oldScore}    +${this.payload.delta}`
        : `rekord: ${this.payload.oldScore}`;
      const bestText = this.add.text(cx, yBestScore, bestLabel, {
        fontFamily: FONT_UI,
        fontSize: '20px',
        fontStyle: '600',
        color: this.payload.isNewRecord ? '#4ade80' : '#cccccc',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(3).setAlpha(0);
      this.tweens.add({ targets: bestText, alpha: 1, duration: 400, delay: 1100 });
    }

    // === Coins / Diamonds delta (zakrywają placeholder "+[COINS]" / "+[DIAMONDS]") ===
    // Pozycje pill'ów w mockup'cie: lewy ~x=510, prawy ~x=770.
    const coinsText = this.add.text(540, yCoinsDiamonds, `🪙 +0`, {
      fontFamily: FONT_BIG,
      fontSize: '30px',
      fontStyle: '800',
      color: '#ffd93c',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(3).setAlpha(0);
    const diamondsText = this.add.text(800, yCoinsDiamonds, `💎 +0`, {
      fontFamily: FONT_BIG,
      fontSize: '30px',
      fontStyle: '800',
      color: '#a8e0ff',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(3).setAlpha(0);
    this.time.delayedCall(1300, () => {
      coinsText.setAlpha(1);
      diamondsText.setAlpha(1);
      const counter = { c: 0, d: 0 };
      this.tweens.add({
        targets: counter,
        c: this.payload.coinsGained,
        d: this.payload.diamondsGained,
        duration: 400,
        ease: 'Cubic.easeOut',
        onUpdate: () => {
          coinsText.setText(`🪙 +${Math.floor(counter.c)}`);
          diamondsText.setText(`💎 +${Math.floor(counter.d)}`);
        },
      });
    });

    // === Ranking Total label (zakrywa placeholder "Ranking Total") ===
    this.add.text(cx, yRankingTitle, '🏅 Ranking Total', {
      fontFamily: FONT_UI,
      fontSize: '24px',
      fontStyle: '600',
      color: '#a8e0ff',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(3);

    // === Ranking values (prev → new pkt) — animowany count-up ===
    const prevTotal = this.payload.previousRankingTotal;
    const newTotal = this.payload.newRankingTotal;
    const deltaTotal = this.payload.rankingDelta;

    const rankingValueText = this.add.text(cx, yRankingValue, `${prevTotal} → ${prevTotal} pkt`, {
      fontFamily: FONT_BIG,
      fontSize: '28px',
      fontStyle: '800',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(3);

    // === Click zones nad baked buttons (asset ma już wizualne przyciski) ===
    // Pozycje + rozmiary z mockup'a (estimaty na 1280×720):
    //   ZAGRAJ PONOWNIE: cx=640, y≈525, w≈540, h≈110 (główny duży)
    //   SKLEP: cx≈465, y≈638, w≈260, h≈75
    //   RANKING: cx≈815, y≈638, w≈260, h≈75
    const playZone = this.add.zone(cx, 525, 540, 110).setOrigin(0.5).setDepth(5).setInteractive({ useHandCursor: true });
    const shopZone = this.add.zone(465, 638, 260, 75).setOrigin(0.5).setDepth(5).setInteractive({ useHandCursor: true });
    const rankingZone = this.add.zone(815, 638, 260, 75).setOrigin(0.5).setDepth(5).setInteractive({ useHandCursor: true });

    // 2.0s gate przed klikalnością.
    [playZone, shopZone, rankingZone].forEach((z) => z.disableInteractive());
    this.time.delayedCall(2000, () => {
      playZone.setInteractive({ useHandCursor: true });
      shopZone.setInteractive({ useHandCursor: true });
      rankingZone.setInteractive({ useHandCursor: true });

      // Ranking count-up animation (po enable buttons).
      if (deltaTotal > 0) {
        const counter = { v: prevTotal };
        this.tweens.add({
          targets: counter, v: newTotal,
          duration: 800, ease: 'Power2.easeOut',
          onUpdate: () => rankingValueText.setText(`${prevTotal} → ${Math.floor(counter.v)} pkt`),
          onComplete: () => rankingValueText.setText(`${prevTotal} → ${newTotal} pkt`),
        });
      } else {
        rankingValueText.setText(`${newTotal} → ${newTotal} pkt`);
      }
    });

    playZone.on('pointerup', () => this._restart());
    shopZone.on('pointerup', () => this._openShop());
    rankingZone.on('pointerup', () => this._openRanking());

    // Klawiatura — dev convenience.
    this.input.keyboard?.on('keydown-SPACE', () => this._restart());
    this.input.keyboard?.on('keydown-ENTER', () => this._restart());
  }

  _buildTopMessage() {
    const { level, isNewRecord, isFirstTime, isCloseMiss } = this.payload;
    if (isFirstTime) {
      return { text: `Pierwszy raz na L${level}!`, color: '#a8e0ff', showBadge: true };
    }
    if (isNewRecord) {
      return { text: `NOWY REKORD na L${level}!`, color: '#ffd93c', showBadge: false };
    }
    if (isCloseMiss) {
      return { text: `Tak blisko! L${level}`, color: '#ff9d3c', showBadge: false };
    }
    return { text: `Level ${level}`, color: '#ffffff', showBadge: false };
  }

  _restart() {
    const player = sessionManager.currentPlayer();
    if (player) {
      player.score = 0;
      player.coins = 0;
      player.diamonds = 0;
      player.lives = 1;
      player.finished = false;
      // 2026-05-13: reset snapshotForLevel żeby kolejny GameScene.startLevel zrobił
      // świeży snapshot (per-level stats / deathsThisLevel).
      delete player._snapshotForLevel;
    }
    // 2026-05-13: clear stale mid-game save. Stary save z `currentLevel: N+1`
    // (z handleFinishLineCrossed PRZED śmiercią w bossie) pozostawałby w localStorage
    // → MenuScene KONTYNUUJ wrzucałby gracza na L+1 mimo że na tym levelu zmarł.
    GameStateStore.clear();
    this._restoreMusic();
    // Po przegranej (level death LUB boss defeat) — zawsze wracamy na początek
    // levelu (GameScene), nie do bossa. Inaczej user mógłby utknąć na walce
    // z bossem bez możliwości przejścia.
    this.scene.start('GameScene');
  }

  _openShop() {
    this._restoreMusic();
    // 2026-05-13: przekaż returnScene żeby ShopScene back wracał do DeathScene
    // zamiast MenuScene (user nie tracił death recap context).
    this.scene.start('ShopScene', { returnScene: 'DeathScene' });
  }

  _openRanking() {
    this._restoreMusic();
    this.scene.start('LeaderboardScene');
  }

  _submitLeaderboard() {
    try {
      const player = sessionManager.currentPlayer();
      if (!player) return;
      const name = (player.name || 'ANON').toString();
      const score = Math.floor(this.payload.rankingScore || 0);
      const level = Math.max(1, this.payload.level || this.payload.fromLevel || 1);
      const coins = Math.floor(player.coins || 0);
      if (score <= 0) return;
      const entry = { name, score, level, coins };
      // 2026-05-13: retry queue dla failed submissions. Bez retry user network
      // fail = wynik nie trafia do globalnego rankingu (silent loss).
      Leaderboard.addAsync(entry)
        .catch(() => {
          try {
            const raw = localStorage.getItem('scary_run_pending_lb') || '[]';
            const queue = JSON.parse(raw);
            queue.push({ ...entry, queuedAt: Date.now() });
            localStorage.setItem('scary_run_pending_lb', JSON.stringify(queue.slice(-10)));
          } catch (_) {}
        });
    } catch (e) { /* ignore */ }
  }

  _duckMusic() {
    try {
      const sfxRegistry = this.sound?.sounds || [];
      this._duckedVolumes = [];
      sfxRegistry.forEach((s) => {
        if (s && typeof s.volume === 'number' && s.isPlaying) {
          this._duckedVolumes.push({ s, v: s.volume });
          s.setVolume(s.volume * 0.3);
        }
      });
    } catch (e) { /* ignore */ }
  }

  _restoreMusic() {
    try {
      (this._duckedVolumes || []).forEach(({ s, v }) => {
        if (s && typeof s.setVolume === 'function') s.setVolume(v);
      });
    } catch (e) { /* ignore */ }
  }
}
