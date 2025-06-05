import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { resolve } from 'path'
import svgr from 'vite-plugin-svgr'

const port = Number(process.env.VITE_PORT) || 5678;

export default defineConfig({
  base: './',
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/sql.js/dist/sql-wasm.wasm',
          dest: 'node_modules/sql.js/dist'
        }
      ]
    }),
    svgr(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
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
