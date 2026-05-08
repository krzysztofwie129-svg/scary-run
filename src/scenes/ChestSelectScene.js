// ChestSelectScene — między LevelComplete a GameScene. Gracz wybiera 1 z 3
// skrzynek; po wyborze: shake → flash → reward reveal → KONTYNUUJ → GameScene.
// Instant rewards aplikowane tu (sessionManager). Pending zapisywane do
// RewardStore i odczytywane na starcie GameScene (applyPendingReward).

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { RewardManager, REWARDS } from '../utils/RewardManager.js';
import { RewardStore } from '../utils/RewardStore.js';
import { sessionManager } from '../utils/SessionManager.js';
import { Haptic } from '../utils/Haptic.js';

export class ChestSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ChestSelectScene' });
  }

  init(data) {
    this.nextScene = data?.nextScene || 'GameScene';
    this.nextSceneData = data?.nextSceneData || {};
    // DEV: forceRewards = [type, type, type] dla testów (np. wszystkie 3 = GIGANT).
    this.forceRewards = Array.isArray(data?.forceRewards) ? data.forceRewards : null;
  }

  create() {
    Haptic.coin?.();

    // Tło z gradientem (ciemny fiolet → ciemniejszy).
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x2a1a4a, 0x2a1a4a, 0x1a0a2e, 0x1a0a2e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.setDepth(-100);

    this.add.text(GAME_WIDTH / 2, 80, 'WYBIERZ SKRZYNIE!', {
      fontSize: '48px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffd93c',
      stroke: '#000',
      strokeThickness: 6,
      shadow: { offsetX: 0, offsetY: 4, color: '#000', blur: 8, fill: true },
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 140, 'Tap jedna z trzech!', {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    // 3 random rewards (gracz nie wie które). DEV: forceRewards z URL ?chest=...
    this.rewards = this.forceRewards && this.forceRewards.length === 3
      ? this.forceRewards
      : RewardManager.random3Rewards();

    const positions = [
      { x: GAME_WIDTH * 0.25, y: GAME_HEIGHT * 0.55 },
      { x: GAME_WIDTH * 0.50, y: GAME_HEIGHT * 0.55 },
      { x: GAME_WIDTH * 0.75, y: GAME_HEIGHT * 0.55 },
    ];

    this.chests = [];
    this.opened = false;
    positions.forEach((pos, i) => {
      this.chests.push(this.createChest(pos.x, pos.y, i));
    });

    // Floating idle.
    this.chests.forEach((chest, i) => {
      this.tweens.add({
        targets: chest.container,
        y: chest.container.y - 8,
        duration: 1500 + i * 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  createChest(x, y, index) {
    const container = this.add.container(x, y);

    // Glow tła — pulsuje subtle.
    const glow = this.add.circle(0, 0, 100, 0xffd93c, 0.12);
    container.add(glow);
    this.tweens.add({
      targets: glow,
      alpha: 0.28, scale: 1.15,
      duration: 1200, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Drewniana skrzynia (graphics) — korpus + wieczko + okucia + kłódka.
    const chest = this.add.graphics();

    // Korpus (dolna część) — ciemniejszy brąz.
    chest.fillStyle(0x8b5a2b, 1);
    chest.fillRoundedRect(-60, 5, 120, 55, 4);
    chest.lineStyle(4, 0x3d2817, 1);
    chest.strokeRoundedRect(-60, 5, 120, 55, 4);

    // Pasy/panele drewna na korpusie (jaśniejszy brąz, gradient feel).
    chest.fillStyle(0xa0703d, 1);
    chest.fillRect(-56, 9, 112, 18);
    chest.fillStyle(0xa0703d, 0.6);
    chest.fillRect(-56, 30, 112, 18);

    // Wieczko (górna część) — jaśniejsze drewno, lekko zaokrąglone u góry.
    chest.fillStyle(0xa0703d, 1);
    chest.fillRoundedRect(-60, -25, 120, 35, 6);
    chest.lineStyle(4, 0x3d2817, 1);
    chest.strokeRoundedRect(-60, -25, 120, 35, 6);

    // Górny pasek wieczka (akcent jaśniejszy złoty).
    chest.fillStyle(0xc9933d, 1);
    chest.fillRect(-56, -22, 112, 6);

    // Linia łączenia wieczka z korpusem.
    chest.fillStyle(0x3d2817, 1);
    chest.fillRect(-60, 5, 120, 4);

    // Złote okucia po bokach (3D plates).
    chest.fillStyle(0xffd93c, 1);
    chest.fillRect(-66, -10, 8, 30);
    chest.lineStyle(2, 0x3d2817, 1);
    chest.strokeRect(-66, -10, 8, 30);
    chest.fillStyle(0xffd93c, 1);
    chest.fillRect(58, -10, 8, 30);
    chest.lineStyle(2, 0x3d2817, 1);
    chest.strokeRect(58, -10, 8, 30);

    // Kłódka centralna — pionowy metalowy pasek.
    chest.fillStyle(0xffd93c, 1);
    chest.fillRect(-12, -25, 24, 38);
    chest.lineStyle(2, 0x3d2817, 1);
    chest.strokeRect(-12, -25, 24, 38);

    // Kółko kłódki (środek).
    chest.fillStyle(0x8b5a2b, 1);
    chest.fillCircle(0, -5, 8);
    chest.lineStyle(2, 0x3d2817, 1);
    chest.strokeCircle(0, -5, 8);

    // Dziurka na klucz (czarna).
    chest.fillStyle(0x1a0a2e, 1);
    chest.fillCircle(0, -6, 2.5);
    chest.fillRect(-1.5, -5, 3, 5);

    // Złote nity dekoracyjne na korpusie.
    chest.fillStyle(0xffd93c, 0.85);
    chest.fillCircle(-40, 18, 2.5);
    chest.fillCircle(40, 18, 2.5);
    chest.fillCircle(-30, 42, 2);
    chest.fillCircle(30, 42, 2);

    container.add(chest);

    // Iskierki blasku wokół (3 statyczne kropki, mrugają).
    const sparkle1 = this.add.circle(-50, -30, 2, 0xffff99, 0.85);
    const sparkle2 = this.add.circle(45, -10, 1.5, 0xffff99, 0.7);
    const sparkle3 = this.add.circle(-30, 50, 1.5, 0xffff99, 0.6);
    container.add([sparkle1, sparkle2, sparkle3]);
    this.tweens.add({
      targets: [sparkle1, sparkle2, sparkle3],
      alpha: 0.2,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: index * 200,
    });

    // Numer skrzynki nad.
    const numberText = this.add.text(0, -85, `${index + 1}`, {
      fontSize: '40px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffd93c',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5);
    container.add(numberText);

    // Hit zone.
    const hit = this.add.rectangle(0, 0, 160, 140, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    container.add(hit);

    hit.on('pointerover', () => {
      if (this.opened) return;
      this.tweens.add({ targets: container, scale: 1.12, duration: 200, ease: 'Back.easeOut' });
    });
    hit.on('pointerout', () => {
      if (this.opened) return;
      this.tweens.add({ targets: container, scale: 1.0, duration: 200 });
    });
    hit.on('pointerup', () => {
      if (this.opened) return;
      this.openChest(index);
    });

    return { container, body: chest, glow, numberText, hit };
  }

  openChest(selectedIndex) {
    this.opened = true;
    // Disable hit zones.
    this.chests.forEach((c) => c.hit.disableInteractive());
    // Dim non-selected.
    this.chests.forEach((c, i) => {
      if (i !== selectedIndex) {
        this.tweens.add({ targets: c.container, alpha: 0.3, scale: 0.8, duration: 400 });
      }
    });

    const selected = this.chests[selectedIndex];
    const rewardType = this.rewards[selectedIndex];
    const reward = REWARDS[rewardType];

    Haptic.crash?.();

    // Shake ~2.4s + glow pulse.
    this.tweens.add({
      targets: selected.container,
      x: selected.container.x + 8,
      duration: 80,
      yoyo: true,
      repeat: 14,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.cameras.main.shake(300, 0.01);
        this.cameras.main.flash(400, 255, 217, 60, false);
        this.openReveal(selected, rewardType, reward);
      },
    });
    this.tweens.add({
      targets: selected.glow,
      alpha: 0.8, scale: 1.5,
      duration: 1200, yoyo: true, repeat: 1,
    });
  }

  openReveal(selected, rewardType, reward) {
    // Chest fade away.
    this.tweens.add({
      targets: selected.container,
      scaleY: 0, alpha: 0,
      duration: 400,
      ease: 'Cubic.easeIn',
      onComplete: () => this.showReward(rewardType, reward),
    });
    // Light beam.
    const beam = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 250, GAME_HEIGHT, 0xffd93c, 0.4);
    this.tweens.add({
      targets: beam,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => beam.destroy(),
    });
  }

  showReward(rewardType, reward) {
    Haptic.gameComplete?.();

    // Radial blask z centrum ekranu — znika po 1.2s.
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
    const cy = GAME_HEIGHT / 2 - 50;
    const c = this.add.container(cx, cy).setScale(0).setDepth(99999);

    // Cartoon drop shadow + main bg z gradient + biały gruby border.
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.4);
    bg.fillRoundedRect(-216, -96, 440, 200, 14);
    bg.fillStyle(reward.color, 1);
    bg.fillRoundedRect(-220, -100, 440, 200, 14);
    bg.lineStyle(5, 0xffffff, 1);
    bg.strokeRoundedRect(-220, -100, 440, 200, 14);
    c.add(bg);

    // Ciemniejsza okrągła ramka pod ikoną (separuje wizualnie).
    const iconBg = this.add.circle(-130, 0, 50, 0x000000, 0.25);
    c.add(iconBg);

    let icon;
    if (reward.spriteKey && this.textures.exists(reward.spriteKey)) {
      icon = this.add.image(-130, 0, reward.spriteKey);
      icon.setDisplaySize(80, 80);
    } else {
      icon = this.add.text(-130, 0, reward.spriteFallback || '🎁', { fontSize: '72px' }).setOrigin(0.5);
    }
    c.add(icon);

    const labelText = this.add.text(20, -25, reward.label, {
      fontSize: '34px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0, 0.5);
    c.add(labelText);

    const descText = this.add.text(20, 22, reward.description, {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0, 0.5);
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
        .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
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
    const btn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 90, 'KONTYNUUJ ▶', {
      fontSize: '32px',
      fontFamily: 'Arial Black, sans-serif',
      color: '#1a0a2e',
      backgroundColor: '#ffd93c',
      padding: { x: 32, y: 12 },
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setScale(1.05));
    btn.on('pointerout', () => btn.setScale(1.0));
    btn.on('pointerup', () => this.applyAndContinue(rewardType, reward));

    this.tweens.add({
      targets: btn,
      scale: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
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
    this.scene.start(this.nextScene, this.nextSceneData);
  }
}
