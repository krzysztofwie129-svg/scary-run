// Dev state — generic POST/GET dla danych z editorów (np. hitbox values).
// Klucz KV STATS: 'devstate:<slot>'.
// Slot wybierany przez query param ?slot=hitbox-edits (max 64 znaki).

const KEY_PREFIX = 'devstate:';
const MAX_BYTES = 128 * 1024; // 128 KB

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request, env }) {
  if (!env.STATS) return jsonResponse({ error: 'KV STATS not bound' }, 503);
  const url = new URL(request.url);
  const slot = url.searchParams.get('slot');
  if (!slot || slot.length > 64) return jsonResponse({ error: 'Invalid slot' }, 400);
  const raw = await env.STATS.get(KEY_PREFIX + slot);
  if (!raw) return jsonResponse({ slot, payload: null, ts: 0 }, 404);
  try { return jsonResponse(JSON.parse(raw)); }
  catch { return jsonResponse({ error: 'Corrupt data' }, 500); }
}

export async function onRequestPost({ request, env }) {
  if (!env.STATS) return jsonResponse({ error: 'KV STATS not bound' }, 503);
  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  const { slot, payload } = body || {};
  if (!slot || typeof slot !== 'string' || slot.length > 64) {
    return jsonResponse({ error: 'Invalid slot' }, 400);
  }
  if (!payload) return jsonResponse({ error: 'Missing payload' }, 400);
  const data = { slot, payload, ts: Date.now() };
  const serialized = JSON.stringify(data);
  if (serialized.length > MAX_BYTES) {
    return jsonResponse({ error: 'Too large' }, 413);
  }
  await env.STATS.put(KEY_PREFIX + slot, serialized);
  return jsonResponse({ ok: true });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}
