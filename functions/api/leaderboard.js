// Cloudflare Pages Function — globalny leaderboard.
//
// SETUP: w Cloudflare dashboard:
//   1. Workers & Pages → KV → Create namespace, nazwa "scary-run-leaderboard"
//   2. Pages → scary-run → Settings → Functions → KV namespace bindings
//      → Variable name: LEADERBOARD, KV namespace: scary-run-leaderboard
//   3. Re-deploy (push do main lub manual deploy)
//
// Endpoints (path: /api/leaderboard):
//   GET  → zwraca top 10 entries jako JSON array
//   POST → body: { name, score, level, coins }
//          response: { rank, entries } gdzie rank to 0-based pozycja
//                    nowego wpisu w top 10, lub -1 jeśli nie zmieścił się
//
// Storage: KV key 'leaderboard' → JSON.stringify(entries[]).
// Read-modify-write nie jest atomic — przy wysokiej współbieżności możliwa
// utrata wpisu. OK dla low-traffic leaderboard gry indie.

const KV_KEY = 'leaderboard';
const MAX_ENTRIES = 50;
const NAME_MAX = 12;
const SCORE_MAX = 10_000_000;

export async function onRequestGet({ env }) {
  if (!env.LEADERBOARD) {
    return jsonResponse({ error: 'KV not bound' }, 503);
  }
  const raw = await env.LEADERBOARD.get(KV_KEY);
  const entries = raw ? safeParse(raw) : [];
  return jsonResponse(entries);
}

export async function onRequestPost({ request, env }) {
  if (!env.LEADERBOARD) {
    return jsonResponse({ error: 'KV not bound' }, 503);
  }

  let entry;
  try {
    entry = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  // Walidacja + sanityzacja.
  if (!entry || typeof entry.name !== 'string' || typeof entry.score !== 'number') {
    return jsonResponse({ error: 'Missing name/score' }, 400);
  }
  const name = entry.name.toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim().slice(0, NAME_MAX);
  if (!name) return jsonResponse({ error: 'Empty name' }, 400);
  if (entry.score < 0 || entry.score > SCORE_MAX || !Number.isFinite(entry.score)) {
    return jsonResponse({ error: 'Invalid score' }, 400);
  }

  const clean = {
    name,
    score: Math.floor(entry.score),
    level: Number.isFinite(entry.level) ? Math.max(1, Math.floor(entry.level)) : 1,
    coins: Number.isFinite(entry.coins) ? Math.max(0, Math.floor(entry.coins)) : 0,
    date: new Date().toISOString(),
  };

  // Read-modify-write.
  const raw = await env.LEADERBOARD.get(KV_KEY);
  const entries = raw ? safeParse(raw) : [];
  entries.push(clean);
  entries.sort((a, b) => b.score - a.score);
  const top = entries.slice(0, MAX_ENTRIES);
  await env.LEADERBOARD.put(KV_KEY, JSON.stringify(top));

  // Rank = 0-based index nowego wpisu w top, -1 jeśli nie zmieścił się
  // (czyli był poza pozycją 10).
  const rank = top.findIndex((e) =>
    e.name === clean.name && e.score === clean.score && e.date === clean.date,
  );

  return jsonResponse({ rank, entries: top });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function safeParse(s) {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
