import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'es2015'
  },
  server: {
    port: 3000
  }
})