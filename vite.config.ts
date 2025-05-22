import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240,
      deleteOriginFile: false,
    }),
    visualizer({ open: false }) // You can enable this for bundle analysis
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
    sourcemap: false, // ✅ hides .tsx in production
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
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('react-router-dom')) return 'vendor-router';
            return 'vendor';
          }

          if (id.includes('/src/pages/admin/')) return 'admin';
          if (id.includes('/src/pages/dashboard/')) return 'dashboard';
          if (id.includes('/src/pages/Index')) return 'landing';
          return undefined;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        globals: {
          react: 'React' // ✅ Prevents missing React reference in vendor bundle
        }
      }
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
