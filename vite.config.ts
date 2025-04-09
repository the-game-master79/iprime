import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Change from "::" to true
    port: 3000,
    strictPort: true,
    open: true,
    watch: {
      usePolling: true
    },
    headers: {
      'Cache-Control': 'public, max-age=31536000',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
      'Content-Security-Policy': "img-src 'self' https: data: blob:",
      'X-Content-Type-Options': 'nosniff'
    },
    fs: {
      strict: false
    },
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 8080
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
