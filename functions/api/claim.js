// Cloudflare Pages Function — claim code (recovery key) mapping.
//
// Endpoints (path: /api/claim):
//   POST → body: { code, deviceId } → claim:{code} → {deviceId, createdAt}
//          409 jeśli code zajęty przez inny deviceId
//          200 ok jeśli ten sam deviceId (re-save) lub nowy
//   GET  → ?code=SCARY-XXXX-XXXX → { deviceId, createdAt } | 404
//
// Storage: KV STATS, klucze:
//   claim:{code}        — JSON {deviceId, createdAt}
//   devicecode:{deviceId} — string code (reverse lookup do regeneration cleanup)
//
// Format kodu: SCARY-[A-HJKMNP-Z2-9]{4}-[same]{4} (32-znakowy alphabet bez I,O,0,1).

const KEY_PREFIX = 'claim:';
const REVERSE_PREFIX = 'devicecode:';
// Alphabet ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (32 znaki, bez I/O/0/1).
const CODE_REGEX = /^SCARY-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

export async function onRequestGet({ request, env }) {
  if (!env.STATS) return jsonResponse({ error: 'KV STATS not bound' }, 503);

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code || !CODE_REGEX.test(code)) {
    return jsonResponse({ error: 'Invalid code format' }, 400);
  }

  const raw = await env.STATS.get(KEY_PREFIX + code);
  if (!raw) return jsonResponse({ deviceId: null }, 404);

  try {
    const parsed = JSON.parse(raw);
    return jsonResponse({ deviceId: parsed.deviceId, createdAt: parsed.createdAt });
  } catch {
    return jsonResponse({ error: 'Corrupt mapping' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.STATS) return jsonResponse({ error: 'KV STATS not bound' }, 503);

  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  const { code, deviceId } = body || {};

  if (!code || !CODE_REGEX.test(code)) {
    return jsonResponse({ error: 'Invalid code format' }, 400);
  }
  if (!deviceId || typeof deviceId !== 'string' || deviceId.length > 64) {
    return jsonResponse({ error: 'Invalid deviceId' }, 400);
  }

  // Collision check: code zajęty przez inny deviceId?
  const existing = await env.STATS.get(KEY_PREFIX + code);
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (parsed.deviceId && parsed.deviceId !== deviceId) {
        return jsonResponse({ error: 'Code already taken' }, 409);
      }
    } catch { /* corrupt → nadpisz */ }
  }

  // Re-generation cleanup: usuń stary code tego deviceId.
  const oldCode = await env.STATS.get(REVERSE_PREFIX + deviceId);
  if (oldCode && oldCode !== code) {
    await env.STATS.delete(KEY_PREFIX + oldCode);
  }

  const payload = { deviceId, createdAt: Date.now() };
  await env.STATS.put(KEY_PREFIX + code, JSON.stringify(payload));
  await env.STATS.put(REVERSE_PREFIX + deviceId, code);

  return jsonResponse({ ok: true, code });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
