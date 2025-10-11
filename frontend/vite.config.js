import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 开发环境代理，将 /api 等请求代理到后端，避免跨域与路径问题
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE || 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: process.env.VITE_API_BASE || 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
      '/dataset': {
        target: process.env.VITE_API_BASE || 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
