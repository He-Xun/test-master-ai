import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const port = Number(process.env.VITE_PORT) || 5678;

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port,
    proxy: {
      '/proxy': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: false,
      },
    },
  },
})
