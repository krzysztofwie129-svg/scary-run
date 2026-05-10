// BossChoiceScene — między L finish a BossFightScene/LevelCompleteScene.
// Image-based redesign (sesja 8.x): banner BG + 2 ozdobne przyciski.

import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { AudioManager } from '../utils/AudioManager.js';
import { Haptic } from '../utils/Haptic.js';
import { StatsTracker } from '../utils/StatsTracker.js';

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

    // BG image (banner POJEDYNEK Z BOSSEM wbudowany).
    if (this.textures.exists('boss_choice_bg')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'boss_choice_bg')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    } else {
      // Fallback BG.
      if (this.textures.exists('bg_layer_00')) {
        this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_layer_00')
          .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
      }
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75);
      this.add.text(GAME_WIDTH / 2, 100, 'POJEDYNEK Z BOSSEM', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '60px',
        color: '#ffd93c',
        stroke: '#000',
        strokeThickness: 8,
      }).setOrigin(0.5);
    }

    // Source button: 2729×576 (~4.74:1). Display 760×160 dla zachowania proporcji.
    const btnW = 760;
    const btnH = 160;

    // FIGHT button — czerwono-złoty (WALCZ Z BOSSEM + Zyskaj 500 punktów wbudowane).
    this.makeImageButton({
      key: 'boss_choice_fight',
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2 - 30,
      w: btnW,
      h: btnH,
      fallbackTitle: 'WALCZ Z BOSSEM!',
      fallbackSub: 'Zyskaj 500 punktów',
      fallbackFill: 0x9b1c4d,
      fallbackStroke: 0xffd93c,
      onClick: () => {
        this.audioManager?.playSfx('click');
        this.scene.start('BossFightScene', {
          fromLevel: this.fromLevel,
          sceneData: this.sceneData,
        });
      },
    });

    // SKIP button — fioletowo-cyan (POMIŃ + Biegnij dalej wbudowane).
    this.makeImageButton({
      key: 'boss_choice_skip',
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2 + 160,
      w: btnW,
      h: btnH,
      fallbackTitle: 'POMIŃ',
      fallbackSub: 'Biegnij dalej',
      fallbackFill: 0x4a2796,
      fallbackStroke: 0x4ecdc4,
      onClick: () => {
        this.audioManager?.playSfx('click');
        StatsTracker.track('bossSkip', { fromLevel: this.fromLevel });
        // Last level — skip = GameComplete bezpośrednio (po L21 nie ma więcej leveli).
        if (this.sceneData?.isLastLevel) {
          this.scene.start('GameCompleteScene', this.sceneData);
        } else {
          this.scene.start('LevelCompleteScene', this.sceneData);
        }
      },
    });
  }

  makeImageButton({ key, x, y, w, h, fallbackTitle, fallbackSub, fallbackFill, fallbackStroke, onClick }) {
    let target;
    if (this.textures.exists(key)) {
      target = this.add.image(x, y, key).setDisplaySize(w, h);
    } else {
      target = this.add.rectangle(x, y, w, h, fallbackFill, 0.92).setStrokeStyle(4, fallbackStroke, 1);
      this.add.text(x, y - 22, fallbackTitle, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '46px',
        color: '#fff',
        stroke: '#000',
        strokeThickness: 5,
      }).setOrigin(0.5);
      this.add.text(x, y + 30, fallbackSub, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '26px',
        color: '#fff',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0.5);
    }
    const sx = target.scaleX;
    const sy = target.scaleY;
    target.setInteractive({ useHandCursor: true });
    target.on('pointerover', () => target.setScale(sx * 1.04, sy * 1.04));
    target.on('pointerout', () => target.setScale(sx, sy));
    target.on('pointerdown', () => target.setScale(sx * 0.96, sy * 0.96));
    target.on('pointerup', () => { target.setScale(sx, sy); onClick(); });
    return target;
  }
}
