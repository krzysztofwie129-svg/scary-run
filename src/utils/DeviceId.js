// DeviceId — anonimowy UUID per device, persistowany w localStorage.
// Pierwszy launch generuje, kolejne odczytują. Service zwraca ten sam ID
// dopóki user nie wyczyści Safari data / nie zainstaluje od nowa.

const STORAGE_KEY = 'scary_run_device_id_v1';

function uuid() {
  // RFC4122 v4 — wymagany dobry RNG (crypto.randomUUID gdzie dostępne).
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback: ręczny v4 dla starszych browserów.
  const r = (n) => Math.floor(Math.random() * n);
  const hex = (n, len) => n.toString(16).padStart(len, '0');
  const a = hex(r(0xffffffff), 8);
  const b = hex(r(0xffff), 4);
  const c = hex((r(0x0fff) | 0x4000), 4);
  const d = hex((r(0x3fff) | 0x8000), 4);
  const e = hex(r(0xffffffffffff), 12);
  return `${a}-${b}-${c}-${d}-${e}`;
}

export const DeviceId = {
  get() {
    try {
      let id = localStorage.getItem(STORAGE_KEY);
      if (!id) {
        id = uuid();
        localStorage.setItem(STORAGE_KEY, id);
      }
      return id;
    } catch (e) {
      // Private mode / disabled — return ephemeral ID dla tej sesji.
      return uuid();
    }
  },
};
