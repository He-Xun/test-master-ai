import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true })
  ],
  base: './',
  server: {
    port: 5678,
    cors: true,
    proxy: {
      '/api-proxy': {
        target: 'http://yunwu.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('代理错误:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('发送请求:', req.method, req.url, '-> 目标:', proxyReq.getHeader('host'));
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('收到响应:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  },
  build: {
    outDir: 'build',
    target: 'chrome112',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('antd')) return 'antd';
            if (id.includes('@ant-design/icons')) return 'ant-icons';
            if (id.includes('xlsx')) return 'xlsx';
            if (id.includes('react')) return 'react';
            if (id.includes('lodash')) return 'lodash';
            if (id.includes('moment')) return 'moment';
            if (id.includes('axios')) return 'axios';
            return 'vendor';
          }
        }
      }
    }
  },
  css: {
    postcss: './postcss.config.js',
  },
}); 