let _shown = false;

export function showErrorOverlay() {
  if (_shown) return;
  _shown = true;

  const overlay = document.createElement('div');
  overlay.id = 'error-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(10, 4, 24, 0.95);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Arial Black', sans-serif;
    color: #ffd93c;
  `;

  overlay.innerHTML = `
    <div style="
      background: #2d1b4e;
      border: 3px solid #ffd93c;
      border-radius: 16px;
      padding: 32px 24px;
      max-width: 400px;
      width: 90%;
      text-align: center;
      box-shadow: 0 0 40px rgba(255, 217, 60, 0.3);
    ">
      <div style="font-size: 56px; margin-bottom: 16px;">😵</div>
      <h2 style="margin: 0 0 12px; font-size: 24px; color: #ffd93c;">Coś się zepsuło</h2>
      <p style="margin: 0 0 24px; font-size: 14px; color: #bdaee3; line-height: 1.5;">
        Wystąpił niespodziewany błąd.<br>
        Odśwież stronę żeby kontynuować.
      </p>
      <button id="error-overlay-reload" style="
        background: #ffd93c;
        color: #1a0a2e;
        border: none;
        border-radius: 8px;
        padding: 14px 32px;
        font-size: 16px;
        font-family: 'Arial Black', sans-serif;
        font-weight: bold;
        cursor: pointer;
        text-transform: uppercase;
      ">Odśwież</button>
      <p style="margin: 16px 0 0; font-size: 11px; color: #6b4ea0; opacity: 0.7;">
        Jeśli problem powraca, przekaż ten kod:<br>
        <span id="error-overlay-device" style="font-family: monospace; color: #bdaee3;"></span>
      </p>
    </div>
  `;

  document.body.appendChild(overlay);

  try {
    const deviceId = localStorage.getItem('scary_run_device_id_v1');
    if (deviceId) {
      const el = document.getElementById('error-overlay-device');
      if (el) el.textContent = deviceId.substring(0, 8) + '...';
    }
  } catch (e) { /* ignore */ }

  document.getElementById('error-overlay-reload').addEventListener('click', () => {
    location.reload();
  });
}

export function attachGlobalErrorHandlers() {
  window.addEventListener('error', (event) => {
    console.error('[Global error]', event.error || event.message);
    showErrorOverlay();
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Unhandled rejection]', event.reason);
    // NIE pokazuj overlay przy promise rejections — często to network glitche
  });
}
