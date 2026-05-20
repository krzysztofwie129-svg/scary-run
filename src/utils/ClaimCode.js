// ClaimCode — generowanie i restore kodów ratunkowych.
// generate() → losuje code, POST /api/claim, zwraca code
// restoreFromCode(code) → GET /api/claim → override deviceId → reload snapshot

import { DeviceId } from './DeviceId.js';
import { initialLoad } from './PlayerSync.js';
import { apiUrl } from './apiBase.js';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 znaki bez I/O/0/1
const API_URL = apiUrl('/api/claim');
const CODE_REGEX = /^SCARY-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

function randomChunk(len = 4) {
  let s = '';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) {
    s += ALPHABET[arr[i] % ALPHABET.length];
  }
  return s;
}

export function generateCode() {
  return `SCARY-${randomChunk(4)}-${randomChunk(4)}`;
}

export async function generateAndSaveCode() {
  const deviceId = DeviceId.get();
  if (!deviceId) throw new Error('Brak deviceId');

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateCode();
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, deviceId }),
    });
    if (response.ok) {
      const result = await response.json();
      try { localStorage.setItem('scaryrun_my_code', result.code); } catch { /* ignore */ }
      return result.code;
    }
    if (response.status === 409) continue;
    throw new Error(`Generate failed: ${response.status}`);
  }
  throw new Error('Generate: too many collisions');
}

/** Czyści invisible chars (zero-width space, NBSP, BOM, RTL marks),
 *  whitespace, polskie/specjalne znaki spoza alphabet ratunkowego.
 *  Akceptuje kody z myślnikiem ASCII/em-dash/hyphen Unicode. */
function sanitizeCode(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[​-‏‪-‮⁠-⁯﻿]/g, '') // zero-width + RTL marks + BOM
    .replace(/ /g, '') // NBSP
    .replace(/[‐-―−]/g, '-') // em/en/figure dash → ASCII hyphen
    .replace(/\s+/g, '') // wszelki whitespace
    .toUpperCase()
    .trim();
}

export async function restoreFromCode(rawCode) {
  const code = sanitizeCode(rawCode);
  if (!CODE_REGEX.test(code)) {
    // Lepszy error: pokaż co user faktycznie wpisał (sanitized), żeby
    // user wiedział czy się literował poprawnie.
    throw new Error(`Nieprawidłowy format. Wpisałeś: "${code}". Oczekiwany: SCARY-XXXX-XXXX`);
  }

  const response = await fetch(`${API_URL}?code=${encodeURIComponent(code)}`);
  if (response.status === 404) return false;
  if (!response.ok) throw new Error(`Restore failed: ${response.status}`);

  const result = await response.json();
  if (!result.deviceId) return false;

  // 2026-05-13: cancel pending debounce PRZED deviceId swap. Bez tego timer
  // (2s after markDirty) mógł fire z buildSnapshot() po nadpisaniu localStorage
  // przez initialLoad → POST mieszany state pod NEW deviceId.
  try {
    const { cancelPendingSync } = await import('./PlayerSync.js');
    cancelPendingSync?.();
  } catch (_) {}

  try {
    localStorage.setItem('scary_run_device_id_v1', result.deviceId);
    localStorage.removeItem('scaryrun_sync_ts'); // żeby initialLoad zaakceptował backend
    localStorage.setItem('scaryrun_my_code', code);
  } catch (e) {
    throw new Error('localStorage failed: ' + (e?.message || ''));
  }

  // 2026-05-13: zaktualizuj window.__playerSyncReady żeby MenuScene 'play' await
  // czekał na NEW initialLoad. Inaczej awaituje stale Promise sprzed claim → race → L1.
  const reloadPromise = initialLoad();
  if (typeof window !== 'undefined') {
    window.__playerSyncReady = reloadPromise.catch((e) => { console.warn('[restoreFromCode] reload failed:', e?.message); });
  }
  await reloadPromise;
  return true;
}

export function getCurrentCode() {
  try { return localStorage.getItem('scaryrun_my_code') || null; }
  catch { return null; }
}
