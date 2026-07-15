import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "icons/apple-touch-icon.png"],
      manifest: {
        name: "Nano Editor — Browser-Native Image Studio",
        short_name: "Nano Editor",
        description:
          "Node-based AI image workflows that run 100% in your browser. Free local AI (background removal, upscaling, object erase, depth, captioning) + bring-your-own-key cloud generation. No uploads, no account.",
        theme_color: "#0a0a0f",
        background_color: "#0a0a0f",
        display: "standalone",
        orientation: "any",
        start_url: "/",
        scope: "/",
        categories: ["graphics", "productivity", "photo"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        // App shell + assets are precached. Models (100s of MB, cross-origin,
        // already Cache-API-cached by our own code) are deliberately NOT
        // handled by Workbox — see modelCache.ts / ortSession.ts.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        navigateFallbackDenylist: [/^\/trial-plugins\//],
        runtimeCaching: [
          {
            // Trial plugin manifests & scripts — network-first so updates land,
            // cache fallback keeps them working offline once seen.
            urlPattern: ({ url }) => url.pathname.startsWith("/trial-plugins/"),
            handler: "NetworkFirst",
            options: { cacheName: "nano-trial-plugins" },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
