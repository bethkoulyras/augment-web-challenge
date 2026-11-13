import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import type { PreviewServer, ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readBlocksFromCsv } from './server/readBlocksFromCsv.ts'

const blockModelPath = fileURLToPath(new URL('./data/private/1_blockmodel.csv', import.meta.url))

function serveBlockData(server: ViteDevServer | PreviewServer): void {
  server.middlewares.use('/api/blocks', async (_request, response) => {
    response.setHeader('Content-Type', 'application/json')
    response.setHeader('Cache-Control', 'no-store')

    try {
      const blocks = await readBlocksFromCsv(blockModelPath)
      response.end(JSON.stringify({ blocks }))
    } catch (error) {
      response.statusCode = 500
      response.end(JSON.stringify({
        error: error instanceof Error ? error.message : 'Could not read the block model.',
      }))
    }
  })
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'local-block-data',
      configureServer: serveBlockData,
      configurePreviewServer: serveBlockData,
    },
  ],
})
