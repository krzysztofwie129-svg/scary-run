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
        globPatterns: ['**/*.{js,css,html,webp,png,opus,mp3,wav,m4a,ico,json}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Po deploy: nowy SW od razu przejmuje (bez czekania na zamknięcie
        // tabu) i czyści stare cache. Bez tego stary index.html + nowy JS
        // hash = 404 → canvas nie startuje → fallback "browser too old".
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /\.(?:webp|png|jpg|jpeg|svg|opus|mp3|wav|m4a)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'scary-run-assets',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
});
