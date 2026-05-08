import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 5173,
    open: false,
    host: true, // dostęp z sieci lokalnej (telefon w tej samej WiFi)
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext',
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'icon-180.png',
        'icon-192.png',
        'icon-512.png',
        'og-image.png',
        'assets/**/*.webp',
        'assets/**/*.opus',
        'assets/**/*.mp3',
        'assets/**/*.wav',
        'assets/**/*.m4a',
      ],
      manifest: {
        name: 'Scary Run',
        short_name: 'Scary Run',
        description: 'Halloween runner game — pobiegnij przez halloweenowe zasadzki!',
        theme_color: '#1a0a2e',
        background_color: '#1a0a2e',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/',
        scope: '/',
        lang: 'pl-PL',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Sesja SW Fix: silent auto-update + StaleWhileRevalidate.
        // skipWaiting + clientsClaim → nowy SW przejmuje natychmiast po pobraniu
        // (bez ekranu "kliknij Reload"). Bez tego user mógł utknąć w starym SW
        // serwującym broken cache.
        skipWaiting: true,
        clientsClaim: true,

        // Pre-cache code + config (hash-based przez Vite — zawsze najnowsze).
        globPatterns: [
          '**/*.{js,css,html,ico,json,webmanifest}',
          'assets/**/*.{webp,png,jpg,svg,opus,mp3,woff2}',
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,

        runtimeCaching: [
          {
            // index.html / nawigacja — NetworkFirst → entry point ZAWSZE świeży.
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'scary-run-pages',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 dni
              },
            },
          },
          {
            // JS/CSS — StaleWhileRevalidate (pokaż stary, w tle pobierz nowy).
            urlPattern: ({ request }) =>
              request.destination === 'script' || request.destination === 'style',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'scary-run-static',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
          {
            // Obrazy (WebP/PNG/SVG) — StaleWhileRevalidate.
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'scary-run-images',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
            },
          },
          {
            // Audio (Opus/MP3/WAV/M4A) — CacheFirst, audio rzadko się zmienia.
            urlPattern: ({ request }) => request.destination === 'audio',
            handler: 'CacheFirst',
            options: {
              cacheName: 'scary-run-audio',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 dni
              },
            },
          },
          {
            // Fonty (Bebas Neue z Google Fonts) — CacheFirst, długie maxAge.
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'scary-run-fonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 rok
              },
            },
          },
        ],

        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
