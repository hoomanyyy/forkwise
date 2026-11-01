import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// host and allowedHosts let the Forkwise Preview panel show the running app.
// Requests to /api go to the backend on port 8000 (the fullstack template).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: true,
    proxy: { "/api": "http://localhost:8000" }
  },
  preview: { host: true, port: 5173, allowedHosts: true }
})
