import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import viteCompression from 'vite-plugin-compression';

export default defineConfig({
  plugins: [
    react(),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // Only compress files > 10KB
      deleteOriginFile: false,
    }),
  ],
  root: './',
  base: './',
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    watch: {
      usePolling: true,
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
    },
    rollupOptions: {
      output: {
        // Commented out for Vercel compatibility testing
        // manualChunks: {
        //   'admin': [
        //     './src/pages/admin/AdminLayout.tsx',
        //     './src/pages/admin/Dashboard.tsx',
        //   ],
        //   'vendor': [
        //     'react',
        //     'react-dom',
        //     'react-router-dom',
        //   ],
        //   'ui': [
        //     './src/components/ui/dialog.tsx',
        //     './src/components/ui/button.tsx',
        //     './src/components/ui/input.tsx'
        //   ],
        // },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  css: {
    devSourcemap: true,
    modules: {
      scopeBehaviour: 'local',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  }
});
