import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  server: {
    port: 5173,
    open: false,
    host: true,  // dostęp z sieci lokalnej (telefon w tej samej WiFi)
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext',
  },
});
