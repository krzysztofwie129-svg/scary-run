// BossChoiceScene — między L finish a BossFightScene/LevelCompleteScene.
// Gracz wybiera: walczyć z bosem (+500 PKT bonus), czy pominąć (idź dalej).

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { AudioManager } from '../utils/AudioManager.js';
import { Haptic } from '../utils/Haptic.js';

export class BossChoiceScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BossChoiceScene' });
  }

  init(data) {
    this.fromLevel = data?.fromLevel || 1;
    this.sceneData = data?.sceneData || {};
  }

  create() {
    this.audioManager = new AudioManager(this);
    Haptic.coin?.();

    // BG — bg_layer_00 z dim overlay (spójne z PauseScene/GameOver).
    if (this.textures.exists('bg_layer_00')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_layer_00')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    }
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75);

    // Title.
    this.add.text(GAME_WIDTH / 2, 100, 'POJEDYNEK Z BOSSEM', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '60px',
      color: '#ffd93c',
      stroke: '#000',
      strokeThickness: 8,
    }).setOrigin(0.5);

    // FIGHT button — ognisty czerwono-złoty.
    const fightCx = GAME_WIDTH / 2;
    const fightCy = GAME_HEIGHT / 2 - 30;
    this.makeChoiceButton({
      cx: fightCx,
      cy: fightCy,
      w: 720,
      h: 150,
      fill: 0x9b1c4d,
      stroke: 0xffd93c,
      title: 'WALCZ Z BOSSEM!',
      titleColor: '#ffe066',
      subtitle: 'Zyskaj 500 punktów',
      subtitleColor: '#ffffff',
      onClick: () => {
        this.audioManager?.playSfx('click');
        this.scene.start('BossFightScene', {
          fromLevel: this.fromLevel,
          sceneData: this.sceneData,
        });
      },
    });

    // SKIP button — chłodny fioletowo-cyan.
    const skipCy = GAME_HEIGHT / 2 + 160;
    this.makeChoiceButton({
      cx: fightCx,
      cy: skipCy,
      w: 720,
      h: 150,
      fill: 0x4a2796,
      stroke: 0x4ecdc4,
      title: 'POMIŃ',
      titleColor: '#a8e0ff',
      subtitle: 'Biegnij dalej',
      subtitleColor: '#ffffff',
      onClick: () => {
        this.audioManager?.playSfx('click');
        this.scene.start('LevelCompleteScene', this.sceneData);
      },
    });
  }

  makeChoiceButton({ cx, cy, w, h, fill, stroke, title, titleColor, subtitle, subtitleColor, onClick }) {
    const btn = this.add.rectangle(cx, cy, w, h, fill, 0.92).setStrokeStyle(4, stroke, 1);
    const titleText = this.add.text(cx, cy - 22, title, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '46px',
      color: titleColor,
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5);
    const subtitleText = this.add.text(cx, cy + 30, subtitle, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '26px',
      color: subtitleColor,
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5);

    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setScale(1.03));
    btn.on('pointerout', () => btn.setScale(1.0));
    btn.on('pointerdown', () => btn.setScale(0.97));
    btn.on('pointerup', () => { btn.setScale(1.0); onClick(); });

    return { btn, titleText, subtitleText };
  }
}
