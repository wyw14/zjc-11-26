import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 4530,
    proxy: {
      '/api': {
        target: 'http://localhost:4030',
        changeOrigin: true
      }
    }
  }
})
