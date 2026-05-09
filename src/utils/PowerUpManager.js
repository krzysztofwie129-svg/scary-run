// PowerUpManager — singleton in-memory managera 5 power-up'ów (sesja C).
// In-memory: NIE persistujemy, reset na każdym level start / game over.
// Heart = instant (NIE ląduje w active map). Shield = unlimited (do hit).
// Reszta = timer-based (8s/5s/12s).

export const POWER_UP_TYPES = {
  MAGNET:       'magnet',
  SHIELD:       'shield',
  SPEED:        'speed',
  DOUBLE_COINS: 'double_coins',
  HEART:        'heart',
};

export const POWER_UP_CONFIG = {
  [POWER_UP_TYPES.MAGNET]: {
    color: 0xff6b9d, colorHex: '#ff6b9d',
    duration: 8000, icon: '🧲',
    label: 'MAGNES', description: 'Przyciaga monety!',
    nameEn: 'MAGNET', weight: 40,
  },
  [POWER_UP_TYPES.SHIELD]: {
    color: 0x4ecdc4, colorHex: '#4ecdc4',
    duration: -1, icon: '🛡️',
    label: 'TARCZA', description: 'Chroni przed obrazeniem!',
    nameEn: 'SHIELD', weight: 20,
  },
  [POWER_UP_TYPES.SPEED]: {
    color: 0xffd93c, colorHex: '#ffd93c',
    duration: 5000, icon: '⚡',
    label: 'TURBO', description: 'Szybciej + niewrazliwy!',
    nameEn: 'SPEED', weight: 15,
  },
  [POWER_UP_TYPES.DOUBLE_COINS]: {
    color: 0xb084ff, colorHex: '#b084ff',
    duration: 12000, icon: '💰',
    label: '2x MONETY', description: 'Kazda moneta x2!',
    nameEn: 'DOUBLE COINS', weight: 15,
  },
  [POWER_UP_TYPES.HEART]: {
    color: 0xff5757, colorHex: '#ff5757',
    duration: 0, icon: '❤️',
    label: 'EKSTRA ZYCIE', description: '+1 zycie!',
    nameEn: 'EXTRA LIFE', weight: 10,
  },
};

export class PowerUpManager {
  constructor() {
    this.active = new Map(); // type -> { startedAt, duration, expiresAt }
    this.listeners = [];
  }

  /** Heart = instant, NIE dodaje do active. Inne = timer-based. */
  activate(type) {
    const cfg = POWER_UP_CONFIG[type];
    if (!cfg) return false;
    if (type === POWER_UP_TYPES.HEART) {
      this.notifyListeners({ event: 'instant', type });
      return true;
    }
    const now = Date.now();
    const expiresAt = cfg.duration > 0 ? now + cfg.duration : -1;
    this.active.set(type, { type, startedAt: now, duration: cfg.duration, expiresAt });
    this.notifyListeners({ event: 'activated', type, duration: cfg.duration });
    return true;
  }

  isActive(type) {
    if (!this.active.has(type)) return false;
    const e = this.active.get(type);
    if (e.expiresAt === -1) return true;
    if (Date.now() >= e.expiresAt) {
      this.deactivate(type);
      return false;
    }
    return true;
  }

  remainingTime(type) {
    if (!this.isActive(type)) return 0;
    const e = this.active.get(type);
    if (e.expiresAt === -1) return -1;
    return Math.max(0, e.expiresAt - Date.now());
  }

  remainingPercent(type) {
    if (!this.isActive(type)) return 0;
    const e = this.active.get(type);
    if (e.expiresAt === -1) return 1;
    if (e.duration <= 0) return 0;
    return this.remainingTime(type) / e.duration;
  }

  deactivate(type) {
    if (!this.active.has(type)) return false;
    this.active.delete(type);
    this.notifyListeners({ event: 'deactivated', type });
    return true;
  }

  clearAll() {
    if (this.active.size === 0) return;
    this.active.clear();
    this.notifyListeners({ event: 'cleared' });
  }

  getActiveTypes() {
    const out = [];
    for (const [t] of this.active) {
      if (this.isActive(t)) out.push(t);
    }
    return out;
  }

  addListener(cb) { this.listeners.push(cb); }
  removeListener(cb) { this.listeners = this.listeners.filter((l) => l !== cb); }
  notifyListeners(ev) {
    this.listeners.forEach((cb) => {
      try { cb(ev); } catch (e) { /* ignore */ }
    });
  }

  /** Wybór losowy ważony. excludeTypes — typy aktualnie aktywne (nie spawnuj duplikatu).
   *  HEART wykluczony zawsze (1 życie 1 szansa = nie ma extra żyć nigdzie). */
  static randomType(excludeTypes = []) {
    const candidates = Object.entries(POWER_UP_CONFIG)
      .filter(([type]) => type !== POWER_UP_TYPES.HEART && !excludeTypes.includes(type));
    if (candidates.length === 0) return POWER_UP_TYPES.MAGNET;
    const total = candidates.reduce((s, [, c]) => s + c.weight, 0);
    let r = Math.random() * total;
    for (const [type, c] of candidates) {
      r -= c.weight;
      if (r <= 0) return type;
    }
    return candidates[0][0];
  }
}

export const powerUpManager = new PowerUpManager();
