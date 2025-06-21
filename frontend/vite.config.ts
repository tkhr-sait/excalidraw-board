import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Bundle analyzer for production builds
    ...(process.env.ANALYZE === 'true'
      ? [
          {
            name: 'bundle-analyzer',
            generateBundle() {
              import('rollup-plugin-visualizer').then(({ visualizer }) => {
                visualizer({
                  filename: 'dist/stats.html',
                  open: true,
                  gzipSize: true,
                  brotliSize: true,
                });
              });
            },
          },
        ]
      : []),
  ],
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/socket.io': {
        target: 'ws://localhost:3002',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      'roughjs/bin/rough': path.resolve(
        __dirname,
        './node_modules/roughjs/bin/rough.js'
      ),
    },
  },
  build: {
    // 本番用最適化設定
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          excalidraw: ['@excalidraw/excalidraw'],
          socket: ['socket.io-client'],
        },
        // ファイル名にハッシュを追加
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // Source mapを本番では無効化
    sourcemap: process.env.NODE_ENV !== 'production',
    // チャンクサイズ警告の閾値を調整
    chunkSizeWarningLimit: 1000,
  },
  // 環境変数の設定
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});
