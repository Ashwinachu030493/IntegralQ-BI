import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // 🧹 Strip console.log and debugger in production builds
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  server: {
    proxy: {
      // Proxy Ollama requests to bypass CORS
      '/api/ollama': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ollama/, '/api'),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('[Vite Proxy] Error:', err.message);
          });
          proxy.on('proxyReq', (_proxyReq, req) => {
            console.log('[Vite Proxy] Forwarding:', req.url);
          });
        }
      }
    }
  }
})
