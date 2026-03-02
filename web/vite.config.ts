import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { defineConfig } from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'

export default defineConfig({
  server: {
    port: 3000,
  },
  // Expose PUBLIC_* env vars to the client bundle (in addition to Vite's default VITE_* prefix).
  // Required for PUBLIC_STRIPE_FOUNDER_URL used in MoltPitLanding.jsx.
  envPrefix: ['VITE_', 'PUBLIC_'],
  plugins: [
    tsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tanstackStart({
      srcDirectory: 'app',
    }),
    viteReact(),
    nitro({
      preset: 'vercel',
    }),
  ],
})
