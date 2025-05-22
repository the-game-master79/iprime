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
      threshold: 10240, // Only compress files > 10KB
      deleteOriginFile: false,
    }),
    visualizer({ open: true }) // Optional: comment out if not needed
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
    sourcemap: false, // ✅ Hides .tsx source files in production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,   // ✅ Removes all console logs
        drop_debugger: true,  // ✅ Removes all debugger statements
      },
      format: {
        comments: false,      // ✅ Strips all inline comments
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
