// GameStateStore — persystencja stanu gry (sesja P1).
// localStorage 'scary_run_save_v1'. State zawiera serialized sessionManager
// + currentLevel. TTL 24h — starsze save'y auto-cleared.

const STORAGE_KEY = 'scary_run_save_v1';
const TTL_MS = 24 * 60 * 60 * 1000;

export const GameStateStore = {
  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...state,
        timestamp: Date.now(),
      }));
    } catch (e) {
      // quota exceeded / private mode — silent fail (UI nie pokazuje "save failed")
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - (data.timestamp || 0) > TTL_MS) {
        GameStateStore.clear();
        return null;
      }
      return data;
    } catch (e) {
      return null;
    }
  },

  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* ignore */ }
  },

  hasSave() {
    return GameStateStore.load() !== null;
  },
};
