// AudioManager — fasada audio: muzyka (HTMLAudioElement streaming) + SFX
// (Phaser sound manager). Muzyka pre-fetchowana w PreloadScene żeby start
// MenuScene był instant.

let currentMusicEl = null;
let currentMusicKey = null;

const preloadedMusic = {};

const MUSIC_URLS = {
  music_menu: 'assets/audio/music_menu.mp3',
};

/** Wystartuj fetch pliku muzyki bez odtwarzania. Idempotent. */
export function preloadMusic(key) {
  if (preloadedMusic[key]) return;
  const url = MUSIC_URLS[key];
  if (!url) return;
  const el = new Audio(url);
  el.preload = 'auto';
  el.loop = true;
  el.volume = 0;
  el.load();
  preloadedMusic[key] = el;
}

export class AudioManager {
  constructor(scene) {
    this.scene = scene;
    this.musicVolume = 0.4;
    this.sfxVolume = 0.7;
  }

  playMusic(key, volume = null, loop = true) {
    const url = MUSIC_URLS[key];
    if (!url) return;
    const targetVolume = volume ?? this.musicVolume;

    // Już gra ten sam track — sync volume.
    if (currentMusicEl && currentMusicKey === key && !currentMusicEl.paused) {
      currentMusicEl.volume = targetVolume;
      return;
    }

    // Inna muzyka grała — zatrzymaj natychmiast (bez fade żeby uniknąć overlap).
    if (currentMusicEl && currentMusicKey !== key) {
      try { currentMusicEl.pause(); } catch (e) {}
      currentMusicEl = null;
    }

    // Reuse preloaded element jeśli był pre-fetched, inaczej nowy.
    let el = preloadedMusic[key];
    if (el) {
      delete preloadedMusic[key];
    } else {
      el = new Audio(url);
      el.preload = 'auto';
    }
    el.loop = loop;
    el.volume = targetVolume;
    el.currentTime = 0;

    currentMusicEl = el;
    currentMusicKey = key;

    // play() może rzucić rejected promise jeśli browser blokuje autoplay.
    // Wtedy próbujemy ponownie po pierwszym geście użytkownika.
    const playPromise = el.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        const resume = () => {
          el.play().catch(() => {});
          window.removeEventListener('pointerdown', resume);
          window.removeEventListener('keydown', resume);
        };
        window.addEventListener('pointerdown', resume, { once: true });
        window.addEventListener('keydown', resume, { once: true });
      });
    }
  }

  stopMusic() {
    if (!currentMusicEl) return;
    try {
      currentMusicEl.pause();
      currentMusicEl.currentTime = 0;
    } catch (e) {}
    currentMusicEl = null;
    currentMusicKey = null;
  }

  /**
   * Krótki SFX. Używamy `scene.sound.play(key, config)` — fire-and-forget,
   * Phaser sam zarządza pulą sounds (auto-cleanup po complete). Wcześniejsza
   * implementacja `sound.add(key)` + ręczny `destroy` na 'complete' nie
   * skalowała się: przy szybkich SFX (jump → coin × 5 → jump) sounds nie
   * zdążały się czyścić, hit limit Phaser sound manager (32 concurrent),
   * część SFX była drop'owana.
   */
  playSfx(key, options = {}) {
    if (!this.scene.cache.audio.exists(key)) return;
    this.scene.sound.play(key, {
      volume: (options.volume ?? 1) * this.sfxVolume,
      rate: options.rate ?? 1,
      detune: options.detune ?? 0,
    });
  }
}
