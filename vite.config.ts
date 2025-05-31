import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: 
          process.env.NODE_ENV === 'production' 
            ? [['transform-remove-console', { exclude: ['error', 'warn'] }]]
            : []
      }
    })
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
    assetsInlineLimit: 8192,
    chunkSizeWarningLimit: 2000,
    minify: process.env.VITE_BUILD_MINIFY === 'true' ? 'esbuild' : 'esbuild',
    sourcemap: false,
    reportCompressedSize: false,
    rollupOptions: {
      input: {
        main: './index.html'
      },
      maxParallelFileOps: 8,
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('antd') || id.includes('@ant-design')) {
              return 'antd';
            }
            if (id.includes('xlsx')) {
              return 'xlsx';
            }
            if (id.includes('sql.js')) {
              return 'sql-wasm';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            if (id.includes('axios') || id.includes('i18next')) {
              return 'api';
            }
            return 'vendor';
          }
          if (id.includes('src/components')) {
            return 'components';
          }
        },
        chunkFileNames: 'assets/[name]-[hash:8].js',
        entryFileNames: 'assets/[name]-[hash:8].js',
        assetFileNames: 'assets/[name]-[hash:8].[ext]'
      },
      external: [],
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: false
      }
    },
    commonjsOptions: {
      include: [/node_modules/]
    }
  },
  css: {
    postcss: './postcss.config.js',
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'antd',
      '@ant-design/icons',
      'axios'
    ],
    exclude: [
      'sql.js',
      'xlsx'
    ]
  },
  cacheDir: 'node_modules/.vite'
}); 