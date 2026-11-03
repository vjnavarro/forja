import { defineConfig } from 'vite';

export default defineConfig({
  base: '/forja/',
  esbuild: { jsx: 'automatic' },
  build: {
    rollupOptions: {
      output: { manualChunks: { charts: ['recharts'] } },
    },
  },
});
