import { defineConfig } from 'vite';

export default defineConfig({
  base: '/forja/',
  esbuild: { jsx: 'automatic' },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['recharts'],
          'firebase-auth': ['firebase/auth'],
          'firebase-data': ['firebase/firestore'],
        },
      },
    },
  },
});
