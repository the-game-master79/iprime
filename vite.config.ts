import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: './',
  base: './',
  server: {
    host: true, // Enable network access
    port: 3000,
    strictPort: true, // Don't try another port if 3000 is taken
    watch: {
      usePolling: true, // Enable polling for Windows compatibility
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  }
});
