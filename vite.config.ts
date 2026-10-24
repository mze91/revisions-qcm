import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// BASE permet de publier l'appli dans un sous-dossier (ex. GitHub Pages : /nom-du-depot/).
export default defineConfig({
  base: process.env.BASE ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      pwaAssets: { image: 'public/favicon.svg' },
      manifest: {
        name: 'Révisions QCM',
        short_name: 'QCM',
        description: 'Entraînement aux QCM à partir de ses propres cours',
        lang: 'fr',
        theme_color: '#6c5ce7',
        background_color: '#f4f3fa',
        display: 'standalone',
      },
    }),
  ],
})
