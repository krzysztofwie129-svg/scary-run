import * as Sentry from '@sentry/browser';
import { DeviceId } from './DeviceId.js';

const SENTRY_DSN = 'https://d66ed42b50bd074cd975decba12c177a@o4511359909888000.ingest.de.sentry.io/4511359925354576';

export function initSentry() {
  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: import.meta.env.MODE || 'production',
      release: 'scary-run@' + (import.meta.env.VITE_RELEASE || 'unknown'),
      sampleRate: 1.0,
      tracesSampleRate: 0,
      autoSessionTracking: true,
      attachStacktrace: true,
      ignoreErrors: [
        /ResizeObserver loop/,
        /Non-Error promise rejection captured/,
        /NetworkError/,
        /Failed to fetch/,
        /AbortError/,
        // WebGL context-recovery crashes — known Phaser bug on weak GPUs,
        // already mitigated by the auto-reload safety net in main.js
        // (_isWebglCrash → _scheduleReload). Mirrors WEBGL_CRASH_PATTERNS
        // there. The genuinely bad case (reload loop) is still reported
        // via captureMessage('WebGL reload loop limit…').
        /Link Shader failed|Framebuffer status|Framebuffer Unsupported|FRAMEBUFFER_(IN)?COMPLETE|gl\.linkProgram|createResource/i,
      ],
      beforeSend(event) {
        try {
          const deviceId = DeviceId.get();
          if (deviceId) {
            event.tags = { ...(event.tags || {}), deviceId };
            event.user = { ...(event.user || {}), id: deviceId };
          }
        } catch (e) { /* ignore */ }
        return event;
      },
    });

    Sentry.setTag('viewport', `${window.innerWidth}x${window.innerHeight}`);
    Sentry.setTag('user_agent', navigator.userAgent.substring(0, 100));

    console.log('[Sentry] zainicjalizowany');
  } catch (e) {
    console.error('[Sentry] init failed:', e);
  }
}

export function reportError(error, context = {}) {
  try {
    if (Sentry && typeof Sentry.captureException === 'function') {
      Sentry.captureException(error, { extra: context });
    }
  } catch (e) { /* ignore */ }
}

export function addBreadcrumb(message, category = 'game', data = {}) {
  try {
    if (Sentry && typeof Sentry.addBreadcrumb === 'function') {
      Sentry.addBreadcrumb({
        message,
        category,
        level: 'info',
        data,
      });
    }
  } catch (e) { /* ignore */ }
}
