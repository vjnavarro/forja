import { defineConfig } from 'vite';
export default defineConfig({ base: '/forja/', build: { rollupOptions: { output: { manualChunks: { charts: ['recharts'] } } } } });
