import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensures assets are loaded correctly in Electron's file protocol
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    exclude: [
      'node_modules/',
      'e2e/',
      'dist/',
      'release/',
      'build/'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'e2e/',
        'src/test/',
        'electron/',
        'dist/',
        'release/'
      ]
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Heavy libraries only loaded when needed
          'epubjs': ['epubjs'],
          // Animation library
          'framer-motion': ['framer-motion'],
          // Core vendor libraries
          'vendor': ['react', 'react-dom'],
          // Data persistence
          'storage': ['localforage']
        }
      }
    },
    // Improve chunk loading in Electron
    modulePreload: {
      polyfill: false
    }
  }
})
