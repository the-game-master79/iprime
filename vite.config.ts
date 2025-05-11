import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import terser from '@rollup/plugin-terser';
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
    sourcemap: false, // Disable sourcemaps in production for better performance
    minify: 'terser', // Use terser for better minification
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
      format: {
        comments: false, // Remove comments
      },
    },
    // Improve chunk loading
    rollupOptions: {
      output: {
        manualChunks: {
          'admin': [
            './src/pages/admin/AdminLayout.tsx',
            './src/pages/admin/Dashboard.tsx',
          ],
          'vendor': [
            'react',
            'react-dom',
            'react-router-dom',
          ],
          'ui': [
            './src/components/ui/dialog.tsx',
            './src/components/ui/button.tsx',
            './src/components/ui/input.tsx'
          ],
        },
        // Optimize chunk size
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  css: {
    // CSS optimization
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
