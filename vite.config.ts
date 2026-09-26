import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",          // affiche l'invite d'installation
      includeAssets: ["nexa.jpg", "nexawbg.png", "favicon.svg"],
      manifest: {
        name: "Nexa OS — Personal AI Work OS",
        short_name: "Nexa OS",
        description: "Transforme tes idées en projets planifiés, exécutables et respectueux de ton énergie.",
        theme_color: "#3525CD",
        background_color: "#F5F5F7",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        scope: "/",
        lang: "fr",
        icons: [
          {
            src: "/nexawbg.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/nexawbg.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/nexa.jpg",
            sizes: "180x180",
            type: "image/jpeg",
            purpose: "any",
          },
        ],
        screenshots: [
          {
            src: "/nexawbg.png",
            sizes: "512x512",
            type: "image/png",
            form_factor: "wide",
            label: "Nexa OS Dashboard",
          },
        ],
        categories: ["productivity", "utilities"],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
