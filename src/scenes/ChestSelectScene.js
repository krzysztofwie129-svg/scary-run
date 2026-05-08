// ChestSelectScene — między LevelComplete a GameScene. Gracz wybiera 1 z 3
// skrzynek na postumencie, opens animation, reveal nagrody, KONTYNUUJ → next.
//
// Redesign (sesja ChestSelect): nowe assety z `public/assets/ui/`:
//  - `chest_select_bg` (1280×720, tytuł "WYBIERZ SKRZYNIE" wbudowany)
//  - `chest_pedestal` (postument pod skrzynię)
//  - `chest_closed` / `chest_open` (przed/po otwarciu)
//  - `chest_numbers` (spritesheet 900×300, 3 klatki 300×300 — cyfry 1/2/3)
//
// Logika nagród zachowana — RewardManager.random3Rewards / applyInstantReward
// / RewardStore.setPending (instant vs pending z PowerUpManager + giant/destroyer).

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { RewardManager, REWARDS } from '../utils/RewardManager.js';
import { RewardStore } from '../utils/RewardStore.js';
import { sessionManager } from '../utils/SessionManager.js';
import { Haptic } from '../utils/Haptic.js';

const CHEST_POSITIONS = [
  { x: GAME_WIDTH * 0.25, y: GAME_HEIGHT * 0.72 },
  { x: GAME_WIDTH * 0.50, y: GAME_HEIGHT * 0.72 },
  { x: GAME_WIDTH * 0.75, y: GAME_HEIGHT * 0.72 },
];

// Sprite scale dopasowany do gameplay area (nie zasłania tytułu z bg).
const CHEST_SCALE = 0.55;
const PEDESTAL_SCALE = 0.6;
const NUMBER_SCALE = 0.5;

const NUMBER_OFFSET_Y = -160;  // cyfra wysoko nad skrzynią
const CHEST_OFFSET_Y = -10;    // skrzynia na postumencie
const PEDESTAL_OFFSET_Y = 60;  // postument lekko niżej

export class ChestSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ChestSelectScene' });
  }

  init(data) {
    this.nextScene = data?.nextScene || 'GameScene';
    this.nextSceneData = data?.nextSceneData || {};
    // DEV: forceRewards = [type, type, type] dla testów (?chest=giant itp.).
    this.forceRewards = Array.isArray(data?.forceRewards) ? data.forceRewards : null;
  }

  create() {
    // Sesja Rotation Fix: jeśli gracz już wybrał skrzynię w tym levelu
    // (np. obrót telefonu zrestartował OrientationLock → ChestSelect re-init),
    // skip natychmiast do nextScene żeby nie pozwolić na drugą wybor + double reward.
    const _player = sessionManager.currentPlayer();
    if (_player && _player.chestUsedAtLevel === _player.level) {
      this.scene.start(this.nextScene, this.nextSceneData);
      return;
    }

    Haptic.coin?.();

    // Tło z całą grafiką (tytuł + tło sceny).
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'chest_select_bg')
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    // Losuj 3 nagrody (lub forceRewards z DEV URL).
    this.rewards = this.forceRewards && this.forceRewards.length === 3
      ? this.forceRewards
      : RewardManager.random3Rewards();

    this.selectionLocked = false;

    // 3 skrzynie: container [pedestal, chest, number] + pulse na samej chest.
    this.chestData = CHEST_POSITIONS.map((pos, index) => {
      const container = this.add.container(pos.x, pos.y);

      const pedestal = this.add.image(0, PEDESTAL_OFFSET_Y, 'chest_pedestal').setScale(PEDESTAL_SCALE);
      const chest = this.add.image(0, CHEST_OFFSET_Y, 'chest_closed').setScale(CHEST_SCALE);
      const number = this.add.sprite(0, NUMBER_OFFSET_Y, 'chest_numbers', index).setScale(NUMBER_SCALE);

      container.add([pedestal, chest, number]);

      // Hit zone — szeroki invisible rect nad/wokół chest+pedestal+number.
      // Niezależny obiekt poza containerem (zoom container hit areas mają
      // dziwne quirk'i w Phaser 3 — direct zone w world coords działa pewnie).
      const hitW = 240;
      const hitH = 380;
      const hitZone = this.add.zone(pos.x, pos.y - 60, hitW, hitH)
        .setInteractive({ useHandCursor: true });

      // Pulse — tylko na samej skrzyni (pedestal + cyfra stabilne).
      // Target = base scale × 1.05 dla subtle wave.
      const pulseTween = this.tweens.add({
        targets: chest,
        scale: CHEST_SCALE * 1.05,
        duration: 1200,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });

      hitZone.on('pointerup', () => this.openChest(index));

      return { container, pedestal, chest, number, pulseTween, hitZone };
    });
  }

  openChest(index) {
    if (this.selectionLocked) return;
    this.selectionLocked = true;

    this.sound.play('chest_open', { volume: 0.7 });

    const selected = this.chestData[index];
    const rewardType = this.rewards[index];
    const reward = REWARDS[rewardType];

    // Disable wszystkie hitZones + zatrzymaj pulse.
    this.chestData.forEach((c) => c.hitZone.disableInteractive());
    this.chestData.forEach((c) => c.pulseTween.stop());

    // Pozostałe 2 — całkowicie znikają (alpha → 0). Wybranej zniknij tylko cyfra.
    this.chestData.forEach((c, i) => {
      if (i !== index) {
        this.tweens.add({ targets: c.container, alpha: 0, duration: 250 });
      } else {
        this.tweens.add({ targets: c.number, alpha: 0, duration: 150 });
      }
    });

    Haptic.crash?.();

    // 1. Shake skrzynię ~600ms.
    this.tweens.add({
      targets: selected.chest,
      x: { from: -8, to: 8 },
      duration: 50,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        selected.chest.setX(0);

        // 2. White flash full-screen.
        const flash = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0)
          .setDepth(99990);
        this.tweens.add({
          targets: flash,
          alpha: 0.8,
          duration: 100,
          yoyo: true,
          onComplete: () => flash.destroy(),
        });
        this.cameras.main.flash(400, 255, 217, 60, false);

        // 3. Podmiana sprite + scale punch (proporcjonalny do CHEST_SCALE).
        this.time.delayedCall(100, () => {
          selected.chest.setTexture('chest_open');
          selected.chest.setScale(CHEST_SCALE);
          this.tweens.add({
            targets: selected.chest,
            scale: { from: CHEST_SCALE, to: CHEST_SCALE * 1.2 },
            duration: 150,
            yoyo: true,
            ease: 'Back.easeOut',
          });
        });

        // 4. Reveal nagrody po 600ms.
        this.time.delayedCall(600, () => this.showReward(rewardType, reward));
      },
    });
  }

  showReward(rewardType, reward) {
    this.sound.play('chest_reveal', { volume: 0.6 });
    Haptic.gameComplete?.();

    // Radial blask z centrum ekranu.
    const blast = this.add.graphics();
    blast.fillStyle(0xffd93c, 0.35);
    blast.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 600);
    blast.setDepth(99990);
    this.tweens.add({
      targets: blast,
      alpha: 0,
      duration: 1200,
      ease: 'Cubic.easeOut',
      onComplete: () => blast.destroy(),
    });

    const cx = GAME_WIDTH / 2;
    // Centered between title (top) i chestów (~518) + 8px lower per user request.
    const cy = (GAME_HEIGHT * 0.45) + 8;
    const c = this.add.container(cx, cy).setScale(0).setDepth(99999);

    // Reward frame v2 — cyan/blue ornate frame z skull + diamond ornaments
    // (source 2333×674, ratio ~3.46:1 → display 720×208 zachowuje proporcje).
    if (this.textures.exists('reward_frame_v2')) {
      const frame = this.add.image(0, 0, 'reward_frame_v2');
      frame.setDisplaySize(720, 208);
      c.add(frame);
      // Zakrywamy baked tekst "+50 MONET / Bonus 500 punktów!" wewnątrz frame'a
      // (każda nagroda renderuje SWOJE label/description, więc baked tekst
      // duplikował się z dynamicznym). Cover trochę mniejszy niż frame interior.
      const cover = this.add.rectangle(80, 0, 540, 150, 0x0a1428, 0.95);
      c.add(cover);
    } else {
      // Fallback: dark fill + cienka biała ramka.
      const bg = this.add.rectangle(0, 0, 720, 180, 0x0a1428, 0.95)
        .setStrokeStyle(2, 0xffffff, 1);
      c.add(bg);
    }

    // Reward icon — duża ikona po lewej (przykrywa baked diamond).
    let icon;
    if (reward.spriteKey && this.textures.exists(reward.spriteKey)) {
      icon = this.add.image(-240, 0, reward.spriteKey);
      icon.setDisplaySize(110, 110);
    } else {
      icon = this.add.text(-240, 0, reward.spriteFallback || '🎁', { fontSize: '90px' }).setOrigin(0.5);
    }
    c.add(icon);

    // Label (centrowany w prawej połowie) — przykrywa baked title.
    const labelText = this.add.text(80, -18, reward.label, {
      fontSize: '42px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffffff',
      stroke: '#1a0a2e',
      strokeThickness: 6,
    }).setOrigin(0.5, 0.5);
    c.add(labelText);

    // Description (centrowane pod label) — przykrywa baked subtitle.
    const descText = this.add.text(80, 32, reward.description, {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: '#a8e0ff',
      stroke: '#1a0a2e',
      strokeThickness: 3,
    }).setOrigin(0.5, 0.5);
    c.add(descText);

    this.tweens.add({
      targets: c, scale: 1.1, duration: 400, ease: 'Back.easeOut',
      onComplete: () => this.tweens.add({ targets: c, scale: 1.0, duration: 200 }),
    });

    this.spawnRewardConfetti();
    this.time.delayedCall(1500, () => this.showContinueButton(rewardType, reward));
  }

  spawnRewardConfetti() {
    const colors = [0xffd93c, 0x4ecdc4, 0xff6b9d, 0xb084ff, 0xffffff];
    for (let i = 0; i < 30; i++) {
      const x = GAME_WIDTH / 2 + Phaser.Math.Between(-200, 200);
      const y = GAME_HEIGHT / 2;
      const size = Phaser.Math.Between(6, 10);
      const c = this.add.rectangle(x, y, size, size, colors[i % colors.length])
        .setStrokeStyle(2, 0x000000)
        .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2))
        .setDepth(99998);
      this.tweens.add({
        targets: c,
        y: y + Phaser.Math.Between(200, 400),
        x: x + Phaser.Math.Between(-150, 150),
        rotation: c.rotation + Math.PI * Phaser.Math.FloatBetween(2, 4),
        alpha: 0,
        duration: 1500,
        delay: i * 30,
        ease: 'Cubic.easeIn',
        onComplete: () => c.destroy(),
      });
    }
  }

  showContinueButton(rewardType, reward) {
    // KONTYNUUJ asset — green/gold button. Pozycja: pod skrzynią.
    const btn = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT - 80, 'continue_button')
      .setOrigin(0.5)
      .setDisplaySize(360, 110)
      .setDepth(99999)
      .setInteractive({ useHandCursor: true });

    btn.setScale(0);
    this.tweens.add({
      targets: btn,
      scale: 1.0,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Idle pulse.
        this.tweens.add({
          targets: btn,
          scale: 1.05,
          duration: 800,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      },
    });

    btn.on('pointerover', () => btn.setScale(1.08));
    btn.on('pointerout', () => btn.setScale(1.0));
    btn.on('pointerup', () => this.applyAndContinue(rewardType, reward));
  }

  applyAndContinue(rewardType, reward) {
    if (reward.instant) {
      RewardManager.applyInstantReward(rewardType, sessionManager);
    } else {
      RewardStore.setPending({
        type: rewardType,
        powerUpType: reward.pendingPowerUp || null,
        modType: reward.pendingMod || null,
        duration: reward.duration ?? null,
      });
    }
    // Mark chest as used for this level — prevents double-reward exploit
    // jeśli scene re-init nastąpi (rotacja telefonu, OrientationLock).
    const _player = sessionManager.currentPlayer();
    if (_player) _player.chestUsedAtLevel = _player.level;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(this.nextScene, this.nextSceneData);
    });
  }
}
