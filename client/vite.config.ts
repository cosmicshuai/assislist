import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Todo System',
        short_name: 'Todos',
        description: 'Personal productivity — capture from WhatsApp, manage here',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        icons: [
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
    }),
  ],
  server: {
    host: '192.168.1.180',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://192.168.1.180:3456',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
})
