import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/PersonalPro/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      workbox: {
        navigateFallback: '/PersonalPro/index.html',
        runtimeCaching: []
      },
      manifest: {
        name: 'PersonalPro',
        short_name: 'PersonalPro',
        description: 'Gestao de aulas e financas para Personal Trainers',
        theme_color: '#7c3aed',
        background_color: '#f1f5f9',
        display: 'standalone',
        start_url: '/PersonalPro/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
})
