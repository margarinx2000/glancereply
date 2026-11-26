import { defineConfig } from 'vite'

// Standard Vite config for an Even Hub app.
// host: true lets the simulator (and a phone on the LAN, for hardware
// sideload via `evenhub qr`) reach the dev server.
export default defineConfig({
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'esnext',
  },
})
