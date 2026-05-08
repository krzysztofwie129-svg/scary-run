// CharSelectScene — wybór postaci (sesja 8.x card-based redesign):
//   • BG cemetery (charselect_bg)
//   • title "WYBIERZ BOHATERA" + subtitle "Wybierz swojego biegacza"
//   • 3 character cards (charselect_card_charNN) z baked name/description/
//     stats/rarity — pełna karta jako textura
//   • back arrow top-left (charselect_back) → MenuScene
//
// Selekcja: tap card → select + confirm. Klawiatura ←/→ i SPACE/ENTER zachowane.

import {
  GAME_WIDTH,
  GAME_HEIGHT,
  CHARACTER_INFO,
} from '../config.js';
import { AudioManager } from '../utils/AudioManager.js';
import { sessionManager } from '../utils/SessionManager.js';

export class CharSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CharSelectScene' });
  }

  create() {
    this.audioManager = new AudioManager(this);

    // 1. BG full-screen.
    if (this.textures.exists('charselect_bg')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'charselect_bg')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    } else if (this.textures.exists('bg_layer_00')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bg_layer_00')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    }

    // 2. Title "WYBIERZ BOHATERA" + subtitle.
    if (this.textures.exists('charselect_title')) {
      this.add.image(GAME_WIDTH / 2, 75, 'charselect_title').setDisplaySize(540, 135);
    }
    if (this.textures.exists('charselect_subtitle')) {
      this.add.image(GAME_WIDTH / 2, 150, 'charselect_subtitle').setDisplaySize(440, 60);
    }

    // 3. Back arrow top-left → MenuScene.
    if (this.textures.exists('charselect_back')) {
      const back = this.add.image(60, 60, 'charselect_back')
        .setDisplaySize(70, 70)
        .setInteractive({ useHandCursor: true });
      back.on('pointerover', () => back.setScale(back.scaleX * 1.1, back.scaleY * 1.1));
      back.on('pointerout', () => back.setScale(back.scaleX / 1.1, back.scaleY / 1.1));
      back.on('pointerup', () => {
        this.audioManager?.playSfx('click');
        this.scene.start('MenuScene');
      });
    }

    // 4. 3 character cards w rzędzie. Większe (320×480) + slide-in z dołu
    // sekwencyjnie (każda kolejna 180ms później). Hit area aktywny dopiero
    // po zakończeniu animacji żeby user nie kliknął kart w locie.
    this.selectedIndex = -1; // -1 = nic nie zaznaczone na starcie
    this.cardImages = [];
    this.inputReady = false;
    const cardW = 320;
    const cardH = 480; // 2:3 ratio z source 1024x1536
    const cardTargetY = GAME_HEIGHT / 2 + 70;
    const cardStartY = GAME_HEIGHT + cardH; // off-screen below
    const slotW = GAME_WIDTH / 3;

    const slideInTweens = [];
    CHARACTER_INFO.forEach((info, idx) => {
      const x = slotW * idx + slotW / 2;
      const cardKey = `charselect_card_${info.key}`;
      const card = this.textures.exists(cardKey)
        ? this.add.image(x, cardStartY, cardKey).setDisplaySize(cardW, cardH)
        : this.add.rectangle(x, cardStartY, cardW, cardH, 0x4a2796).setStrokeStyle(3, 0xffe066);

      const baseScaleX = card.scaleX;
      const baseScaleY = card.scaleY;

      // Slide-in tween — 500ms ease.back, stagger 180ms.
      slideInTweens.push(this.tweens.add({
        targets: card,
        y: cardTargetY,
        duration: 500,
        delay: idx * 180,
        ease: 'Back.easeOut',
      }));

      card.on('pointerover', () => {
        if (this.inputReady && idx !== this.selectedIndex) {
          card.setScale(baseScaleX * 1.04, baseScaleY * 1.04);
        }
      });
      card.on('pointerout', () => {
        if (this.inputReady && idx !== this.selectedIndex) {
          card.setScale(baseScaleX, baseScaleY);
        }
      });
      card.on('pointerup', () => {
        if (!this.inputReady) return;
        this.select(idx);
        this.confirm();
      });

      this.cardImages.push({ card, baseScaleX, baseScaleY });
    });

    // Last tween onComplete → włącz interakcję + zaznacz default selection + odpal pulsację kart.
    const lastTween = slideInTweens[slideInTweens.length - 1];
    lastTween.on('complete', () => {
      this.inputReady = true;
      this.cardImages.forEach(({ card, baseScaleX, baseScaleY }, idx) => {
        card.setInteractive({ useHandCursor: true });
        // Idle pulse — fala od lewej do prawej. Stagger 300ms, breath 1.0 → 1.05.
        this.tweens.add({
          targets: card,
          scaleX: baseScaleX * 1.05,
          scaleY: baseScaleY * 1.05,
          duration: 900,
          delay: idx * 300,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      });
    });

    // 5. Klawiatura. Pierwszy LEFT/RIGHT z selectedIndex=-1 jumps do 0.
    const move = (delta) => {
      const base = this.selectedIndex < 0 ? 0 : this.selectedIndex + delta;
      this.select((base + CHARACTER_INFO.length) % CHARACTER_INFO.length);
    };
    this.input.keyboard?.on('keydown-LEFT', () => move(-1));
    this.input.keyboard?.on('keydown-A', () => move(-1));
    this.input.keyboard?.on('keydown-RIGHT', () => move(1));
    this.input.keyboard?.on('keydown-D', () => move(1));
    this.input.keyboard?.on('keydown-SPACE', () => this.confirm());
    this.input.keyboard?.on('keydown-ENTER', () => this.confirm());
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MenuScene'));
  }

  select(idx) {
    this.selectedIndex = idx;
    this.refreshSelection();
  }

  refreshSelection() {
    this.cardImages.forEach(({ card, baseScaleX, baseScaleY }, i) => {
      const isSelected = i === this.selectedIndex;
      const k = isSelected ? 1.08 : 1;
      card.setScale(baseScaleX * k, baseScaleY * k);
    });
  }

  confirm() {
    if (this.selectedIndex < 0) return; // nic nie wybrane → nic nie rób
    const charKey = CHARACTER_INFO[this.selectedIndex].key;
    sessionManager.setCharacter(charKey);
    this.audioManager?.playSfx('click');
    this.scene.start('GameScene');
  }
}
