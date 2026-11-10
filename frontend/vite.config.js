import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import seoPlugin from "./seo-plugin.js"

export default defineConfig({
  plugins: [react(), seoPlugin()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://127.0.0.1:5000", ws: true },
      "/p/": { target: "http://127.0.0.1:5000" }
    }
  },
  build: {
    chunkSizeWarningLimit: 4000
  }
})
