// Cloudflare Pages Function — hybrid backup snapshotu gracza.
//
// Endpoints (path: /api/player):
//   POST → body: { deviceId, snapshot, ts }
//          response: { ok: true, accepted: bool, reason? }
//   GET  → ?deviceId=X → zwraca { snapshot, ts } lub { snapshot: null, ts: 0 }
//
// Storage: KV STATS, klucz playersave:{deviceId} → JSON { snapshot, ts }.
// Konflikt resolution: last-write-wins (newer ts wygrywa, starszy odrzucany).

const KEY_PREFIX = 'playersave:';
const MAX_SIZE_BYTES = 64 * 1024; // 64KB sanity limit per snapshot

export async function onRequestGet({ request, env }) {
  if (!env.STATS) return jsonResponse({ error: 'KV STATS not bound' }, 503);

  const url = new URL(request.url);
  const deviceId = url.searchParams.get('deviceId');
  if (!deviceId || typeof deviceId !== 'string' || deviceId.length > 64) {
    return jsonResponse({ error: 'Invalid deviceId' }, 400);
  }

  const raw = await env.STATS.get(KEY_PREFIX + deviceId);
  if (!raw) return jsonResponse({ snapshot: null, ts: 0 });

  try {
    return jsonResponse(JSON.parse(raw));
  } catch {
    return jsonResponse({ snapshot: null, ts: 0 });
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.STATS) return jsonResponse({ error: 'KV STATS not bound' }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { deviceId, snapshot, ts } = body || {};

  if (!deviceId || typeof deviceId !== 'string' || deviceId.length > 64) {
    return jsonResponse({ error: 'Invalid deviceId' }, 400);
  }
  if (!snapshot || typeof snapshot !== 'object') {
    return jsonResponse({ error: 'Invalid snapshot' }, 400);
  }
  if (typeof ts !== 'number' || !Number.isFinite(ts) || ts <= 0) {
    return jsonResponse({ error: 'Invalid ts' }, 400);
  }

  const serialized = JSON.stringify({ snapshot, ts });
  if (serialized.length > MAX_SIZE_BYTES) {
    return jsonResponse({ error: 'Snapshot too large' }, 413);
  }

  // Last-write-wins: odrzuć starszy snapshot.
  const key = KEY_PREFIX + deviceId;
  const existing = await env.STATS.get(key);
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (parsed.ts && parsed.ts > ts) {
        return jsonResponse({ ok: true, accepted: false, reason: 'stale' });
      }
    } catch { /* ignore — nadpisz */ }
  }

  await env.STATS.put(key, serialized);
  return jsonResponse({ ok: true, accepted: true });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
