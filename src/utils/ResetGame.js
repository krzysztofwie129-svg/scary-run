// ResetGame — kasuje lokalny postęp gracza, zostawia deviceId + claim code.
//
// Co usuwamy (localStorage):
//   game_wallet, game_bestScores, game_currentLevel, game_totalRuns, game_lastRankingScore
//   scaryrun_owned_skins, scaryrun_equipped_skin
//   scaryrun_owned_powerups, scaryrun_active_powerup
//   scaryrun_wallet_init_v1
//   scary_run_save_v1
//   scaryrun_sync_ts
//
// Co ZOSTAJE:
//   scary_run_device_id_v1 (deviceId zostaje — Player Sync nadpisze KV pod nim freshem)
//   scaryrun_my_code (claim code dalej działa)
//   scaryrun_difficulty (settings użytkownika)
//
// Backend leaderboard (KV) — NIE dotykamy. Stary nick + wynik zostaje
// w top 50, nowe wpisy z nowym imieniem dodadzą się jako nowe pozycje.

import { sessionManager } from './SessionManager.js';
import { markDirty } from './PlayerSync.js';
import { PlayerStore } from './PlayerStore.js';

const KEYS_TO_CLEAR = [
  'game_wallet',
  'game_bestScores',
  'game_currentLevel',
  'game_totalRuns',
  'game_lastRankingScore',
  'scaryrun_owned_skins',
  'scaryrun_equipped_skin',
  'scaryrun_owned_powerups',
  'scaryrun_active_powerup',
  'scaryrun_wallet_init_v1',
  'scary_run_save_v1',
  'scaryrun_sync_ts',
];

export function resetGame() {
  for (const key of KEYS_TO_CLEAR) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }
  // Wyczyść zapisane imię — żeby MenuScene play → NameInputScene (user wpisze nowe).
  try { PlayerStore.clear(); } catch { /* ignore */ }
  // Reset session in-memory.
  try { sessionManager.reset(); } catch { /* ignore */ }
  // Trigger sync — backend dostanie pusty snapshot pod istniejącym deviceId.
  try { markDirty(); } catch { /* ignore */ }
}
