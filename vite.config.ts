import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react()
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
    assetsDir: 'assets',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: {
          // 将大型第三方库单独分包，但保持依赖关系简单
          'xlsx': ['xlsx'],
          'antd': ['antd', '@ant-design/icons']
        }
      }
    }
  },
  css: {
    postcss: './postcss.config.js',
  },
}); 