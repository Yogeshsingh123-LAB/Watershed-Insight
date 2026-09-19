import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const backend = process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',          // reachable from the container / preview host
    port: 3000,
    strictPort: false,
    allowedHosts: true,      // allow *.e2b.app / any tunnel host
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/static': { target: backend, changeOrigin: true },
      '/docs': { target: backend, changeOrigin: true },
      '/openapi.json': { target: backend, changeOrigin: true },
    },
  },
  preview: { host: '0.0.0.0', port: 3000, allowedHosts: true },
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 1600 },
})
