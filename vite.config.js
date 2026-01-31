import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensures assets are loaded correctly in Electron's file protocol
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
