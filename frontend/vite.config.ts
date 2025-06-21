import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/socket.io': {
        target: 'ws://localhost:3001',
        ws: true,
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
    rollupOptions: {
      output: {
        manualChunks: {
          'excalidraw': ['@excalidraw/excalidraw'],
          'socket.io': ['socket.io-client'],
        },
      },
    },
  },
})