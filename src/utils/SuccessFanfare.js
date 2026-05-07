// SuccessFanfare — generuje fanfarę "tada!" w locie używając Web Audio API.
// 4 nuty (C5, E5, G5, C6), 150ms każda + 50ms gap, oscillator triangle (łagodny),
// ADSR per nuta, master volume 0.3 żeby nie zagłuszało reszty.
//
// Plus: nie wymaga assetu — działa nawet bez ffmpeg / preloadu fanfary.

const NOTES_HZ = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
const NOTE_DURATION = 0.15; // s
const NOTE_GAP = 0.05;       // s
const MASTER_VOLUME = 0.3;
const ATTACK = 0.01;
const DECAY = 0.05;
const SUSTAIN_LEVEL = 0.5;
const RELEASE = 0.1;

let cachedCtx = null;

function getAudioContext() {
  if (cachedCtx) return cachedCtx;
  // Phaser w sound managerze trzyma Web Audio context, ale dostęp wymaga
  // referencji do scene — robimy własny żeby moduł był stateless w kontekście
  // wywołania. Przeglądarki cache'ują AudioContexty per origin.
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  cachedCtx = new Ctor();
  return cachedCtx;
}

/**
 * Odtwarz fanfarę natychmiast. Nieblokujące — schedule'uje na
 * AudioContext currentTime + 0.
 */
export function playFanfare() {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Niektóre przeglądarki (Safari, Chrome bez interakcji) trzymają context
  // suspended — resume() wymaga gestu użytkownika. Próbujemy resume, jeśli
  // się nie uda — nic, fanfara po prostu nie zagra.
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const master = ctx.createGain();
  master.gain.value = MASTER_VOLUME;
  master.connect(ctx.destination);

  const startTime = ctx.currentTime;
  for (let i = 0; i < NOTES_HZ.length; i++) {
    const noteStart = startTime + i * (NOTE_DURATION + NOTE_GAP);
    scheduleNote(ctx, master, NOTES_HZ[i], noteStart, NOTE_DURATION);
  }

  // Cleanup master gain po zakończeniu (~1s później) — zwalnia node graph.
  const totalLen = NOTES_HZ.length * (NOTE_DURATION + NOTE_GAP) + 0.2;
  setTimeout(() => master.disconnect(), totalLen * 1000);
}

function scheduleNote(ctx, dest, freq, startTime, duration) {
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = freq;

  const gain = ctx.createGain();
  // ADSR — start od 0, attack do 1, decay do sustain, hold, release do 0.
  const t0 = startTime;
  const tAttack = t0 + ATTACK;
  const tDecay = tAttack + DECAY;
  const tSustainEnd = t0 + duration;
  const tEnd = tSustainEnd + RELEASE;

  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(1, tAttack);
  gain.gain.linearRampToValueAtTime(SUSTAIN_LEVEL, tDecay);
  gain.gain.setValueAtTime(SUSTAIN_LEVEL, tSustainEnd);
  gain.gain.linearRampToValueAtTime(0, tEnd);

  osc.connect(gain);
  gain.connect(dest);
  osc.start(t0);
  osc.stop(tEnd + 0.05);
}
