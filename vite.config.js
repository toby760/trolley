import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
          react({
                  include: '**/*.{js,jsx}',
          }),
          VitePWA({
                  registerType: 'autoUpdate',
                  includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'masked-icon.svg'],
                  manifest: {
                            name: 'Trolley \u2014 Smart Shopping List',
                            short_name: 'Trolley',
                            description: 'Shared household shopping list with smart features',
                            theme_color: '#1B5E3B',
                            background_color: '#0F1A14',
                            display: 'standalone',
                            orientation: 'portrait',
                            scope: '/',
                            start_url: '/',
                            icons: [
                              { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
                              { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
                              { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
                                      ]
                  },
                  workbox: {
                            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                            runtimeCaching: [
                              {
                                            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                                            handler: 'CacheFirst',
                                            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
                              },
                              {
                                            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                                            handler: 'CacheFirst',
                                            options: { cacheName: 'gstatic-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } }
                              }
                                      ]
                  }
          })
        ],
    server: { port: 3000 }
});
