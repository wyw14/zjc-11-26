import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 4525,
    proxy: {
      '/api': {
        target: 'http://localhost:4025',
        changeOrigin: true
      }
    }
  }
})
