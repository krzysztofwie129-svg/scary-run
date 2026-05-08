// Cloudflare Pages Function — anonim player stats per deviceId.
//
// SETUP w Cloudflare dashboard:
//   1. Workers & Pages → KV → Create namespace 'scary-run-stats'
//   2. Pages → scary-run → Settings → Functions → KV namespace bindings
//      → Variable name: STATS, KV namespace: scary-run-stats
//   3. Re-deploy
//
// Endpoints (path: /api/stats):
//   POST → body: { deviceId, event, payload, ts }
//          response: { ok: true } | { error }
//   GET  → ?deviceId=X → zwraca aggregate stats dla danego device
//          (bez query: zwraca summary wszystkich devices — admin only przez secret)
//
// Storage: KV key 'player:{deviceId}' → JSON {
//   firstSeen, lastSeen,
//   totals: { games, levelsCompleted, bossWins, bossLosses, bossSkips, gameOvers, gameCompletes },
//   levels: { [levelId]: { starts, completes } },
//   recent: [last 200 events { event, payload, ts }],
// }

const MAX_RECENT_EVENTS = 200;
const KEY_PREFIX = 'player:';

const VALID_EVENTS = new Set([
  'gameStart',
  'levelStart',
  'levelComplete',
  'bossSkip',
  'bossWin',
  'bossDefeat',
  'gameOver',
  'gameComplete',
]);

export async function onRequestPost({ request, env }) {
  if (!env.STATS) {
    return jsonResponse({ error: 'KV STATS not bound' }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { deviceId, event, payload, ts } = body || {};

  // Walidacja.
  if (typeof deviceId !== 'string' || deviceId.length < 8 || deviceId.length > 64) {
    return jsonResponse({ error: 'Invalid deviceId' }, 400);
  }
  if (typeof event !== 'string' || !VALID_EVENTS.has(event)) {
    return jsonResponse({ error: 'Invalid event' }, 400);
  }
  const sanitizedPayload = sanitizePayload(payload);
  const eventTs = Number.isFinite(ts) ? Math.floor(ts) : Date.now();
  const key = KEY_PREFIX + deviceId;

  // Read-modify-write.
  const raw = await env.STATS.get(key);
  const data = raw ? safeParse(raw) : initData(eventTs);

  data.lastSeen = eventTs;
  data.totals = data.totals || initTotals();
  data.levels = data.levels || {};
  data.recent = Array.isArray(data.recent) ? data.recent : [];

  // Update aggregates.
  applyEventToTotals(data, event, sanitizedPayload);

  // Append do recent (capped).
  data.recent.push({ event, payload: sanitizedPayload, ts: eventTs });
  if (data.recent.length > MAX_RECENT_EVENTS) {
    data.recent = data.recent.slice(-MAX_RECENT_EVENTS);
  }

  await env.STATS.put(key, JSON.stringify(data));

  return jsonResponse({ ok: true });
}

export async function onRequestGet({ request, env }) {
  if (!env.STATS) {
    return jsonResponse({ error: 'KV STATS not bound' }, 503);
  }
  const url = new URL(request.url);
  const deviceId = url.searchParams.get('deviceId');
  if (!deviceId) {
    return jsonResponse({ error: 'Missing deviceId param' }, 400);
  }
  const raw = await env.STATS.get(KEY_PREFIX + deviceId);
  if (!raw) {
    return jsonResponse({ error: 'Not found' }, 404);
  }
  return jsonResponse(safeParse(raw));
}

// === Helpers ===

function initData(ts) {
  return {
    firstSeen: ts,
    lastSeen: ts,
    totals: initTotals(),
    levels: {},
    recent: [],
  };
}

function initTotals() {
  return {
    games: 0,
    levelsCompleted: 0,
    bossWins: 0,
    bossLosses: 0,
    bossSkips: 0,
    gameOvers: 0,
    gameCompletes: 0,
  };
}

function applyEventToTotals(data, event, payload) {
  const t = data.totals;
  switch (event) {
    case 'gameStart':
      t.games += 1;
      break;
    case 'levelStart': {
      const lvl = sanitizeLevel(payload.level);
      if (lvl !== null) {
        data.levels[lvl] = data.levels[lvl] || { starts: 0, completes: 0 };
        data.levels[lvl].starts += 1;
      }
      break;
    }
    case 'levelComplete': {
      t.levelsCompleted += 1;
      const lvl = sanitizeLevel(payload.level);
      if (lvl !== null) {
        data.levels[lvl] = data.levels[lvl] || { starts: 0, completes: 0 };
        data.levels[lvl].completes += 1;
      }
      break;
    }
    case 'bossWin':
      t.bossWins += 1;
      break;
    case 'bossDefeat':
      t.bossLosses += 1;
      break;
    case 'bossSkip':
      t.bossSkips += 1;
      break;
    case 'gameOver':
      t.gameOvers += 1;
      break;
    case 'gameComplete':
      t.gameCompletes += 1;
      break;
    default:
      // unknown — already filtered by VALID_EVENTS.
      break;
  }
}

function sanitizeLevel(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.floor(n);
  if (i < 1 || i > 100) return null;
  return i;
}

function sanitizePayload(p) {
  if (!p || typeof p !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(p)) {
    if (typeof k !== 'string' || k.length > 32) continue;
    if (typeof v === 'string') out[k] = v.slice(0, 64);
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
    // skip object/array/null/undefined
    if (Object.keys(out).length >= 16) break;
  }
  return out;
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return initData(Date.now());
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
