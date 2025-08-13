import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false
      },
      // Proxy for BioMini Web Agent
      '/biomini': {
        target: 'https://localhost',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/biomini/, ''),
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('🚨 BioMini proxy error:', err.message);
            console.log('🔗 Failed URL:', req.url);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('📤 BioMini proxy request:', req.method, req.url, '→', proxyReq.path);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('📥 BioMini proxy response:', req.url, '→', proxyRes.statusCode, proxyRes.statusMessage);
          });
        }
      }
    }
  },
  preview: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
}) 