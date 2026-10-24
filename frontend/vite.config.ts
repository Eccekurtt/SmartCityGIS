/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Geliştirmede /api isteklerini ASP.NET Core API'ye yönlendirir.
    // Tarayıcı tek bir adresle (5173) konuştuğu için CORS ayarına gerek kalmaz.
    proxy: {
      '/api': 'http://localhost:5046',
      '/health': 'http://localhost:5046',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: false,
  },
})
