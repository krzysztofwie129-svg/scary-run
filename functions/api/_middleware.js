// CORS middleware — łapie wszystkie /api/* (Pages Functions auto-chain).
// Potrzebne dla Capacitor iOS, gdzie origin = capacitor://localhost lub
// https://localhost (WKWebView server.iosScheme), więc fetch do scaryrun.pl
// jest cross-origin i wymaga preflight + Allow-Origin.

const ALLOWED_ORIGINS = new Set([
  'capacitor://localhost',
  'https://localhost',
  'ionic://localhost',
  'https://scaryrun.pl',
  'https://scaryrun.win',
  'https://www.scaryrun.pl',
  'http://localhost:5173',
  'http://localhost:4173',
]);

function corsHeadersFor(origin) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://scaryrun.pl';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export async function onRequest(context) {
  const { request, next } = context;
  const origin = request.headers.get('Origin') || '';
  const cors = corsHeadersFor(origin);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  const response = await next();
  const headers = new Headers(response.headers);
  // Endpoint może mieć już własne CORS (np. dev-state.js z '*'); nie nadpisuj.
  for (const [k, v] of Object.entries(cors)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
