import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "::",
    port: 8080,
    watch: {
      usePolling: true
    },
    headers: {
      'Cache-Control': 'public, max-age=31536000',
    },
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
        manualChunks: {
          vendor: ['react', 'react-dom'],
          auth: ['@supabase/auth-js'],
          components: [
            '@/components/ui/button',
            '@/components/ui/input',
            '@/components/ui/card'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
