import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { blockDataPlugin } from './server/blockDataPlugin.ts'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    blockDataPlugin(fileURLToPath(new URL('./data/private/', import.meta.url))),
  ],
})
