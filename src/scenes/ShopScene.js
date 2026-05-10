// ShopScene — zakładki SKINY / POWER-UPY (KONTYNUACJE usunięte).
// Karty skinów: animowany sprite postaci z baseChar + tint + alpha,
// nazwa, cena lub status (KUP / ZAŁÓŻ / AKTUALNY).
// Dialog kupna + dialog "Założyć teraz?" — modale overlay.
// Wszystko na localStorage (playerStorage). Brak backendu w tej sesji.

import { GAME_WIDTH, GAME_HEIGHT, ANIM_FRAME_COUNTS } from '../config.js';
import { SKINS, getSkinById } from '../data/skins.js';
import { POWERUPS } from '../data/powerups.js';
import {
  getCoins, setCoins, getDiamonds, setDiamonds,
  getOwnedSkins, addOwnedSkin,
  getEquippedSkin, setEquippedSkin,
  getOwnedPowerups, addPowerup, getActivePowerup, setActivePowerup,
} from '../data/playerStorage.js';
import { getRankingScore } from '../utils/storage.js';

const ANIMS = ['idle'];
const FRAME_RATES = { idle: 12 };
const pad2 = (n) => String(n).padStart(2, '0');

function ensureIdleAnim(scene, charKey) {
  const key = `${charKey}_idle`;
  if (scene.anims.exists(key)) return;
  const count = ANIM_FRAME_COUNTS.idle;
  const frames = [];
  for (let i = 0; i < count; i++) frames.push({ key: `${charKey}_idle_${pad2(i)}` });
  scene.anims.create({ key, frames, frameRate: FRAME_RATES.idle, repeat: -1 });
}

const TAB_SKINS = 'skins';
const TAB_POWERUPS = 'powerups';

export class ShopScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ShopScene' });
  }

  async create() {
    this.activeTab = TAB_SKINS;
    this._cardObjects = [];
    this._tabContentObjects = [];
    this._modalObjects = [];

    // === Background image ===
    if (this.textures.exists('shop_bg')) {
      this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'shop_bg').setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(0);
    } else {
      this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a0a2e).setDepth(0);
    }

    // Header SKLEP — image banner pośrodku góry.
    if (this.textures.exists('shop_header_sklep')) {
      this.add.image(GAME_WIDTH / 2, 50, 'shop_header_sklep').setDisplaySize(540, 110).setDepth(2);
    } else {
      this.add.text(GAME_WIDTH / 2, 35, 'SKLEP', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '38px',
        color: '#ffd93c',
        stroke: '#000',
        strokeThickness: 5,
      }).setOrigin(0.5).setDepth(2);
    }

    // Back button — image (← WRÓĆ z bake'd text).
    if (this.textures.exists('shop_btn_back')) {
      const back = this.add.image(110, 50, 'shop_btn_back').setDisplaySize(180, 60).setDepth(2)
        .setInteractive({ useHandCursor: true });
      back.on('pointerover', () => back.setScale(back.scaleX * 1.05, back.scaleY * 1.05));
      back.on('pointerout', () => back.setScale(back.scaleX / 1.05, back.scaleY / 1.05));
      back.on('pointerup', () => this.scene.start('MenuScene'));
    } else {
      const backBtn = this.add.text(20, 35, '← WRÓĆ', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '24px',
        color: '#ffd93c',
        backgroundColor: '#3a1d5a',
        padding: { x: 12, y: 6 },
      }).setOrigin(0, 0.5).setDepth(2).setInteractive({ useHandCursor: true });
      backBtn.on('pointerup', () => this.scene.start('MenuScene'));
    }

    // Balance (prawa) — PKT + monety + diamenty.
    const coins = await getCoins();
    const diamonds = await getDiamonds();
    const pkt = getRankingScore();
    this.balanceText = this.add.text(GAME_WIDTH - 20, 50, `PKT ${pkt}    🪙 ${coins}    💎 ${diamonds}`, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(1, 0.5).setDepth(2);

    // === Tabs row ===
    this._buildTabs();

    // === Tab content ===
    await this._renderTab();
  }

  async _refreshBalance() {
    const c = await getCoins();
    const d = await getDiamonds();
    const p = getRankingScore();
    if (this.balanceText) this.balanceText.setText(`PKT ${p}    🪙 ${c}    💎 ${d}`);
  }

  _buildTabs() {
    const tabsY = 145; // niżej żeby nie nachodzić na SKLEP banner (header ~y=50, h=110, bottom~105)
    const tabW = 280;
    const tabH = 70;
    const gap = 20;
    const totalW = 2 * tabW + gap;
    const startX = (GAME_WIDTH - totalW) / 2 + tabW / 2;

    // Tab assets mają baked tekst SKINY / POWER-UPY i odróżniają się stylem (active gold glow / inactive purple).
    // Active = lighter, inactive = darker. Aktualnie używamy obu zawsze (active version dla aktywnej, inactive dla drugiej).
    const tabs = [
      { key: TAB_SKINS, label: 'SKINY', activeKey: 'shop_tab_skiny', inactiveKey: 'shop_tab_skiny' },
      { key: TAB_POWERUPS, label: 'POWER-UPY', activeKey: 'shop_tab_powerupy', inactiveKey: 'shop_tab_powerupy' },
    ];

    this._tabRefs = [];
    tabs.forEach((tab, idx) => {
      const x = startX + idx * (tabW + gap);
      const isActive = tab.key === this.activeTab;
      const assetKey = isActive ? tab.activeKey : tab.inactiveKey;

      let bg, glow;
      let baseScaleX = 1, baseScaleY = 1;
      if (this.textures.exists(assetKey)) {
        bg = this.add.image(x, tabsY, assetKey).setDisplaySize(tabW, tabH).setDepth(2);
        // Capture displaySize-derived scale (setScale potem RESETUJE to do native — używamy baseScale × multiplier).
        baseScaleX = bg.scaleX;
        baseScaleY = bg.scaleY;
        if (!isActive) {
          bg.setAlpha(0.45);
        } else {
          // Active glow + pulse — wizualnie odróżnia wybraną zakładkę.
          glow = this.add.rectangle(x, tabsY, tabW + 14, tabH + 14, 0x000000, 0)
            .setStrokeStyle(4, 0xffd93c, 1)
            .setDepth(1);
          this.tweens.add({
            targets: glow,
            scaleX: 1.04,
            scaleY: 1.04,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
          // Scale punch (multiplikuje base — NIE setScale absolute).
          bg.setScale(baseScaleX * 0.92, baseScaleY * 0.92);
          this.tweens.add({
            targets: bg,
            scaleX: baseScaleX,
            scaleY: baseScaleY,
            duration: 220,
            ease: 'Back.easeOut',
          });
        }
      } else {
        const fill = isActive ? 0x9b6dff : 0x3a1d5a;
        const stroke = isActive ? 0xffd93c : 0x6b4ea0;
        bg = this.add.rectangle(x, tabsY, tabW, tabH, fill, 1).setStrokeStyle(2, stroke).setDepth(2);
        const text = this.add.text(x, tabsY, tab.label, {
          fontFamily: 'Arial Black, sans-serif',
          fontSize: '22px',
          color: isActive ? '#ffd93c' : '#bdaee3',
          stroke: '#000',
          strokeThickness: 3,
        }).setOrigin(0.5).setDepth(3);
        this._tabRefs.push({ bg, text });
      }

      bg.setInteractive({ useHandCursor: true });
      // Hover/press feedback — wszystkie scale multiplikatywne na baseScale (NIE absolute).
      bg.on('pointerover', () => bg.setScale(baseScaleX * 1.04, baseScaleY * 1.04));
      bg.on('pointerout', () => bg.setScale(baseScaleX, baseScaleY));
      bg.on('pointerdown', () => bg.setScale(baseScaleX * 0.95, baseScaleY * 0.95));
      bg.on('pointerup', () => {
        bg.setScale(baseScaleX, baseScaleY);
        if (this.activeTab !== tab.key) {
          this.activeTab = tab.key;
          this._tabRefs.forEach((r) => { try { r.bg.destroy(); r.text?.destroy(); r.glow?.destroy(); } catch (e) {} });
          this._tabRefs = [];
          this._buildTabs();
          this._renderTab();
        }
      });
      if (!this._tabRefs.find((r) => r.bg === bg)) this._tabRefs.push({ bg, glow });
    });
  }

  async _renderTab() {
    // Clean up previous tab content + scroll handlers.
    this._tabContentObjects.forEach((o) => { try { o.destroy(); } catch (e) {} });
    this._tabContentObjects = [];
    this._cardObjects.forEach((c) => { try { c.container.destroy(); } catch (e) {} });
    this._cardObjects = [];
    if (this._scrollHandlers) {
      try {
        this.input.off('pointerdown', this._scrollHandlers.onDown);
        this.input.off('pointermove', this._scrollHandlers.onMove);
        this.input.off('pointerup', this._scrollHandlers.onUp);
      } catch (e) { /* ignore */ }
      this._scrollHandlers = null;
    }
    this._scrollState = null;
    this._lastDragDistance = 0;

    if (this.activeTab === TAB_SKINS) {
      await this._renderSkinsTab();
    } else if (this.activeTab === TAB_POWERUPS) {
      await this._renderPowerupsTab();
    }
  }

  _renderStubTab() {
    const t = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, 'Wkrótce dostępne!', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '36px',
      color: '#ffd93c',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(2);
    this._tabContentObjects.push(t);
  }

  async _renderSkinsTab() {
    const owned = await getOwnedSkins();
    const equipped = await getEquippedSkin();

    // Layout: 2 kolumny × portrait karty (matching shop_card asset 1122×1402 = 1:1.25).
    const cols = 2;
    const cardW = 420;
    const cardH = 525; // ~ 1.25× cardW (matching asset aspect)
    const gapX = 30;
    const gapY = 25;
    const gridW = cols * cardW + (cols - 1) * gapX;
    const startX = (GAME_WIDTH - gridW) / 2 + cardW / 2;

    const viewportTop = 200; // pod tabami (tabs y=145 + tabH/2=35 + 20px margin)
    const viewportH = GAME_HEIGHT - viewportTop - 15;

    // Pre-load anim defs dla wszystkich charów (idle) — char01-03 + char04-07.
    ['char01', 'char02', 'char03', 'char04', 'char05', 'char06', 'char07'].forEach((c) => ensureIdleAnim(this, c));

    // Sortowanie po cenie rosnąco — default 0 → najdroższy.
    const sortedSkins = [...SKINS].sort((a, b) => (a.price || 0) - (b.price || 0));
    const totalRows = Math.ceil(sortedSkins.length / cols);
    const totalContentH = totalRows * cardH + (totalRows - 1) * gapY;

    // Container scroll-able dla całego grida.
    this._cardsContainer = this.add.container(0, viewportTop).setDepth(3);
    this._tabContentObjects.push(this._cardsContainer);

    sortedSkins.forEach((skin, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cardX = startX + col * (cardW + gapX);
      const cardY = cardH / 2 + row * (cardH + gapY);

      const isOwned = owned.includes(skin.id);
      const isEquipped = isOwned && skin.id === equipped;

      const card = this._buildSkinCard({
        skin, x: cardX, y: cardY, w: cardW, h: cardH,
        isOwned, isEquipped,
      });
      this._cardsContainer.add(card.container);
      this._cardObjects.push(card);
    });

    // Drag-scroll gdy overflow — smooth lerp + momentum (RAF, nie event-direct).
    const overflow = Math.max(0, totalContentH - viewportH);
    this._lastDragDistance = 0;
    if (overflow > 0) {
      this._setupSmoothScroll(this._cardsContainer, viewportTop, overflow);

      // Wskaźnik scroll (mały gradient/strzałka u dołu) — opcjonalne.
      const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 8, '↕ przewiń', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        color: '#a8e0ff',
      }).setOrigin(0.5).setDepth(5);
      this._tabContentObjects.push(hint);
    }
  }

  async _renderPowerupsTab() {
    const owned = await getOwnedPowerups();
    const activeId = await getActivePowerup();

    // Layout: 1 kolumna × N wierszy. Container scroll-able.
    const cardW = 800;
    const cardH = 100;
    const gapY = 14;
    const viewportTop = 200;
    const viewportH = GAME_HEIGHT - viewportTop - 15;
    const totalContentH = POWERUPS.length * cardH + (POWERUPS.length - 1) * gapY;

    this._cardsContainer = this.add.container(0, viewportTop).setDepth(3);
    this._tabContentObjects.push(this._cardsContainer);

    POWERUPS.forEach((powerup, i) => {
      const cardY = cardH / 2 + i * (cardH + gapY); // relatywne do containera
      const cardX = GAME_WIDTH / 2;
      const ownedCount = owned[powerup.id] || 0;
      const isActive = activeId === powerup.id;

      const borderColor = isActive ? 0xffd93c : 0x6b4ea0;
      const borderW = isActive ? 4 : 2;
      const cardBg = this.add.rectangle(cardX, cardY, cardW, cardH, 0x2d1b4e, 0.95).setStrokeStyle(borderW, borderColor);
      this._cardsContainer.add(cardBg);

      // Lewa: ikona emoji.
      const iconText = this.add.text(cardX - cardW / 2 + 50, cardY, powerup.icon, { fontSize: '54px' }).setOrigin(0.5);
      this._cardsContainer.add(iconText);

      // Środek-lewo: nazwa + opis.
      const nameText = this.add.text(cardX - cardW / 2 + 110, cardY - 18, powerup.name, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '24px',
        color: '#ffd93c',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0, 0.5);
      const descText = this.add.text(cardX - cardW / 2 + 110, cardY + 18, powerup.description, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: '#bdaee3',
      }).setOrigin(0, 0.5);
      this._cardsContainer.add([nameText, descText]);

      // Środek-prawo: licznik 'Masz: X'.
      const countText = this.add.text(cardX + cardW / 2 - 290, cardY, `Masz: ${ownedCount}`, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0.5);
      this._cardsContainer.add(countText);

      // Prawo-górne: KUP button (zawsze widoczny).
      const buyX = cardX + cardW / 2 - 110;
      const buyY = cardY - 20;
      const buyBtn = this.add.rectangle(buyX, buyY, 180, 40, 0x4ade80, 1).setStrokeStyle(2, 0x166534);
      const buyText = this.add.text(buyX, buyY, `KUP 🪙 ${powerup.price}`, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '16px',
        color: '#0f1c0f',
      }).setOrigin(0.5);
      buyBtn.setInteractive({ useHandCursor: true });
      buyBtn.on('pointerup', async () => {
        const coins = await getCoins();
        if (coins < powerup.price) {
          this._showShortToast('Za mało monet!');
          return;
        }
        await setCoins(coins - powerup.price);
        await addPowerup(powerup.id, 1);
        await this._refreshBalance();
        await this._renderTab();
      });
      this._cardsContainer.add([buyBtn, buyText]);

      // Prawo-dolne: USTAW / AKTYWNY button — tylko jeśli ownedCount > 0.
      if (ownedCount > 0) {
        const setX = buyX;
        const setY = cardY + 25;
        const setLabel = isActive ? 'AKTYWNY ✓' : 'USTAW';
        const setFill = isActive ? 0xffd93c : 0x6b4eb8;
        const setColor = isActive ? '#1a0a2e' : '#ffffff';
        const setBtn = this.add.rectangle(setX, setY, 180, 40, setFill, 1).setStrokeStyle(2, 0xffd93c);
        const setText = this.add.text(setX, setY, setLabel, {
          fontFamily: 'Arial Black, sans-serif',
          fontSize: '16px',
          color: setColor,
        }).setOrigin(0.5);
        setBtn.setInteractive({ useHandCursor: true });
        setBtn.on('pointerup', async () => {
          await setActivePowerup(isActive ? null : powerup.id);
          await this._renderTab();
        });
        this._cardsContainer.add([setBtn, setText]);
      }
    });

    // Drag-scroll setup gdy overflow — smooth lerp + momentum.
    const overflow = Math.max(0, totalContentH - viewportH);
    this._lastDragDistance = 0;
    if (overflow > 0) {
      this._setupSmoothScroll(this._cardsContainer, viewportTop, overflow);
    }
  }

  /** Smooth drag-scroll z momentum (eliminuje "szarpanie" wynikające z direct
   *  Container.y = pointer.y w event handler).
   *  - Pointer events update _scrollTargetY (target).
   *  - Game loop (update()) lerp'uje container.y → _scrollTargetY (factor 0.30).
   *  - Po pointerup: velocity-based momentum, decay 0.92 per klatkę, dopóki >0.3.
   */
  _setupSmoothScroll(container, viewportTop, overflow) {
    const minY = viewportTop - overflow;
    const maxY = viewportTop;
    container.y = maxY;

    const state = {
      container,
      viewportTop,
      minY, maxY,
      targetY: maxY,
      velocity: 0,
      isDragging: false,
      dragStartPointerY: 0,
      dragStartTargetY: 0,
      lastMoveTs: 0,
      lastMoveY: 0,
    };

    const onDown = (pointer) => {
      if (pointer.y < viewportTop) return;
      state.isDragging = true;
      state.dragStartPointerY = pointer.y;
      state.dragStartTargetY = state.targetY;
      state.velocity = 0;
      state.lastMoveTs = performance.now();
      state.lastMoveY = pointer.y;
      this._lastDragDistance = 0;
    };
    const onMove = (pointer) => {
      if (!state.isDragging) return;
      const dy = pointer.y - state.dragStartPointerY;
      this._lastDragDistance = Math.max(this._lastDragDistance, Math.abs(dy));
      state.targetY = Phaser.Math.Clamp(state.dragStartTargetY + dy, minY, maxY);
      // Trackuj velocity dla momentum.
      const now = performance.now();
      const dt = Math.max(8, now - state.lastMoveTs);
      state.velocity = ((pointer.y - state.lastMoveY) / dt) * 16; // px / klatka @60fps
      state.lastMoveY = pointer.y;
      state.lastMoveTs = now;
    };
    const onUp = () => { state.isDragging = false; };

    this.input.on('pointerdown', onDown);
    this.input.on('pointermove', onMove);
    this.input.on('pointerup', onUp);
    this._scrollHandlers = { onDown, onMove, onUp };
    this._scrollState = state; // dla update()
  }

  // Phaser scene hook — wywołane co klatkę. Lerp container.y → targetY plus
  // momentum decay po pointerup.
  update() {
    const s = this._scrollState;
    if (!s || !s.container || !s.container.scene) return;
    // Momentum (gdy nie dragujemy i velocity != 0).
    if (!s.isDragging && Math.abs(s.velocity) > 0.3) {
      s.targetY = Phaser.Math.Clamp(s.targetY + s.velocity, s.minY, s.maxY);
      s.velocity *= 0.92;
      if (s.targetY === s.minY || s.targetY === s.maxY) s.velocity = 0; // bounce off
    } else if (!s.isDragging) {
      s.velocity = 0;
    }
    // Smooth lerp container Y → target.
    const diff = s.targetY - s.container.y;
    if (Math.abs(diff) > 0.1) {
      s.container.y += diff * 0.30;
    } else {
      s.container.y = s.targetY;
    }
  }

  _showShortToast(message) {
    const toast = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 100, message, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '24px',
      color: '#ff5757',
      stroke: '#000',
      strokeThickness: 4,
      backgroundColor: 'rgba(0,0,0,0.7)',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setDepth(99999);
    this.tweens.add({
      targets: toast,
      alpha: 0,
      duration: 1500,
      delay: 800,
      onComplete: () => { try { toast.destroy(); } catch (e) {} },
    });
  }

  _buildSkinCard({ skin, x, y, w, h, isOwned, isEquipped }) {
    const container = this.add.container(x, y).setDepth(3);

    // Card BG asset:
    //   isEquipped → shop_card_equipped (gold border + ✓ AKTUALNY baked at bottom)
    //   else (UNOWNED lub OWNED-not-equipped) → shop_card_unowned (purple border + green ZAŁÓŻ baked at bottom)
    // Source 1122×1402 → display matchuje cardH/cardW.
    const cardKey = isEquipped ? 'shop_card_equipped' : 'shop_card_unowned';
    let bg;
    if (this.textures.exists(cardKey)) {
      // Equipped asset ma większy gold-glow padding — skaluj ~115% żeby visible frame matchował unowned.
      const scaleBoost = isEquipped ? 1.15 : 1.0;
      bg = this.add.image(0, 0, cardKey).setDisplaySize(w * scaleBoost, h * scaleBoost);
    } else {
      const borderColor = isEquipped ? 0xffd93c : 0x6b4ea0;
      const borderW = isEquipped ? 4 : 3;
      bg = this.add.rectangle(0, 0, w, h, 0x2a1248, 0.95).setStrokeStyle(borderW, borderColor);
    }
    container.add(bg);

    // Sprite preview — duży, na środku górnej części karty (portrait layout).
    const baseChar = skin.baseChar || 'char01';
    const animKey = `${baseChar}_idle`;
    const initialFrame = `${baseChar}_idle_00`;
    let sprite = null;
    if (this.textures.exists(initialFrame)) {
      // Sprite center ~y = -20% h (centrum dungeon arch area).
      sprite = this.add.sprite(0, -h * 0.20, initialFrame).setScale(0.50);
      if (this.anims.exists(animKey)) sprite.play(animKey);
      if (skin.tint != null) sprite.setTint(skin.tint);
      sprite.setAlpha(skin.alpha != null ? skin.alpha : 1.0);
      container.add(sprite);
    }

    // Name — w obszarze placeholder'a w karcie (~y = +15% wysokości).
    const nameText = this.add.text(0, h * 0.15, skin.name, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '38px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 5,
    }).setOrigin(0.5);
    container.add(nameText);

    // Status: card asset ma już BAKED baseline button ZAŁÓŻ (unowned) lub baked ✓ AKTUALNY (equipped).
    // Dla UNOWNED: zakrywamy baked ZAŁÓŻ button overlay'em z ceną i przycisk KUP.
    if (isEquipped) {
      // Baked "✓ AKTUALNY" w kartcie — nic nie dodajemy, aktywne.
      // Click na kartę: re-equip (no-op) — pomijamy.
    } else if (isOwned) {
      // Baked green "ZAŁÓŻ" button — pozycja w karcie: ~y = +35% wysokości.
      const hitW = w * 0.7;
      const hitH = h * 0.13;
      const hit = this.add.zone(0, h * 0.35, hitW, hitH).setOrigin(0.5).setInteractive({ useHandCursor: true });
      hit.on('pointerup', async () => {
        if ((this._lastDragDistance || 0) > 10) return;
        await setEquippedSkin(skin.id);
        await this._renderTab();
      });
      container.add(hit);
    } else {
      // UNOWNED: zakryj baked "ZAŁÓŻ" button + dodaj cenę + KUP overlay (y=+35%).
      const coverY = h * 0.35;
      const coverW = w * 0.78;
      const coverH = h * 0.14;
      const cover = this.add.rectangle(0, coverY, coverW, coverH, 0x1a0a2e, 1).setStrokeStyle(3, 0xffd93c);
      const priceText = this.add.text(0, coverY, `KUP   💎 ${skin.price}`, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '32px',
        color: '#ffd93c',
        stroke: '#000',
        strokeThickness: 4,
      }).setOrigin(0.5);
      cover.setInteractive({ useHandCursor: true });
      cover.on('pointerup', () => {
        if ((this._lastDragDistance || 0) > 10) return;
        this._openBuyDialog(skin);
      });
      container.add(cover);
      container.add(priceText);
    }

    return { container, skin };
  }

  async _openBuyDialog(skin) {
    this._closeModal();
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const w = 480;
    const h = 380;

    const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setDepth(100).setInteractive();
    const box = this.add.rectangle(cx, cy, w, h, 0x2a1248, 0.98).setStrokeStyle(3, 0xffd93c).setDepth(101);
    const title = this.add.text(cx, cy - h / 2 + 35, `KUPIĆ ${skin.name.toUpperCase()}?`, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '26px',
      color: '#ffd93c',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(102);

    // Sprite preview.
    const baseChar = skin.baseChar || 'char01';
    const initialFrame = `${baseChar}_idle_00`;
    let preview = null;
    if (this.textures.exists(initialFrame)) {
      ensureIdleAnim(this, baseChar);
      preview = this.add.sprite(cx, cy - 20, initialFrame).setScale(0.22).setDepth(102);
      preview.play(`${baseChar}_idle`);
      if (skin.tint != null) preview.setTint(skin.tint);
      preview.setAlpha(skin.alpha != null ? skin.alpha : 1.0);
    }

    const diamonds = await getDiamonds();
    const canAfford = diamonds >= skin.price;
    const lack = skin.price - diamonds;

    const priceText = this.add.text(cx, cy + 70, `Cena: 💎 ${skin.price}`, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '22px',
      color: '#a8e0ff',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(102);

    const youHaveText = this.add.text(cx, cy + 100, `Masz: 💎 ${diamonds}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: canAfford ? '#ffffff' : '#ff5b5b',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(102);

    let lackText = null;
    if (!canAfford) {
      lackText = this.add.text(cx, cy + 130, `Brakuje ${lack} 💎`, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '18px',
        color: '#ff5b5b',
        stroke: '#000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(102);
    }

    // Buttons.
    const btnY = cy + h / 2 - 35;
    const cancelBtn = this._makeModalButton(cx - 100, btnY, 160, 44, 'ANULUJ', 0x6b3eb6, 0xffd93c, '#fff', () => {
      this._closeModal();
    });
    const buyFill = canAfford ? 0x4ade80 : 0x444444;
    const buyTextColor = canAfford ? '#0f1c0f' : '#888';
    const buyBtn = this._makeModalButton(cx + 100, btnY, 160, 44, 'KUP', buyFill, 0xffd93c, buyTextColor, async () => {
      if (!canAfford) return;
      await setDiamonds(diamonds - skin.price);
      await addOwnedSkin(skin.id);
      await this._refreshBalance();
      this._closeModal();
      this._openEquipPromptDialog(skin);
    }, !canAfford);

    this._modalObjects = [overlay, box, title];
    if (preview) this._modalObjects.push(preview);
    this._modalObjects.push(priceText, youHaveText);
    if (lackText) this._modalObjects.push(lackText);
    this._modalObjects.push(...cancelBtn, ...buyBtn);
  }

  _openEquipPromptDialog(skin) {
    this._closeModal();
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const w = 480;
    const h = 240;

    const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setDepth(100).setInteractive();
    const box = this.add.rectangle(cx, cy, w, h, 0x2a1248, 0.98).setStrokeStyle(3, 0x4ade80).setDepth(101);
    const title = this.add.text(cx, cy - h / 2 + 35, `${skin.name.toUpperCase()} KUPIONY!`, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '24px',
      color: '#4ade80',
      stroke: '#000',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(102);

    const prompt = this.add.text(cx, cy - 5, 'Założyć teraz?', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '22px',
      color: '#ffffff',
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(102);

    const btnY = cy + h / 2 - 35;
    const laterBtn = this._makeModalButton(cx - 100, btnY, 160, 44, 'PÓŹNIEJ', 0x6b3eb6, 0xffd93c, '#fff', async () => {
      this._closeModal();
      await this._renderTab();
    });
    const equipBtn = this._makeModalButton(cx + 100, btnY, 160, 44, 'ZAŁÓŻ', 0x4ade80, 0xffd93c, '#0f1c0f', async () => {
      await setEquippedSkin(skin.id);
      this._closeModal();
      await this._renderTab();
    });

    this._modalObjects = [overlay, box, title, prompt, ...laterBtn, ...equipBtn];
  }

  _makeModalButton(x, y, w, h, label, fill, stroke, textColor, onClick, disabled = false) {
    const bg = this.add.rectangle(x, y, w, h, fill, 0.95).setStrokeStyle(2, stroke).setDepth(102);
    const text = this.add.text(x, y, label, {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '20px',
      color: textColor,
      stroke: '#000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(103);
    if (!disabled) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => bg.setScale(1.04));
      bg.on('pointerout', () => bg.setScale(1.0));
      bg.on('pointerdown', () => bg.setScale(0.96));
      bg.on('pointerup', () => { bg.setScale(1.0); onClick(); });
    }
    return [bg, text];
  }

  _closeModal() {
    this._modalObjects.forEach((o) => { try { o.destroy(); } catch (e) {} });
    this._modalObjects = [];
  }
}
