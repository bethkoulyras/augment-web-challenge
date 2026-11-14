import { join } from 'node:path'
import { promisify } from 'node:util'
import { gzip, gunzip } from 'node:zlib'
import type { Plugin, PreviewServer, ViteDevServer } from 'vite'
import { readBlockModelFromCsv } from './readBlockModelFromCsv.ts'

const compress = promisify(gzip)
const decompress = promisify(gunzip)

export function blockDataPlugin(dataDirectory: string): Plugin {
  let cachedResponse: Promise<Buffer> | undefined

  const serveBlockData = (server: ViteDevServer | PreviewServer): void => {
    server.middlewares.use('/api/block-model', async (request, response) => {
      response.setHeader('Content-Type', 'application/json')
      response.setHeader('Cache-Control', 'no-store')
      response.setHeader('Vary', 'Accept-Encoding')
      if (request.method !== 'GET') {
        response.statusCode = 405
        response.setHeader('Allow', 'GET')
        response.end(JSON.stringify({ error: 'Use GET to load the block models.' }))
        return
      }

      try {
        cachedResponse ??= readBlockModelFromCsv(join(dataDirectory, '1_blockmodel.csv'), join(dataDirectory, '1_mbm.csv'))
          .then((model) => compress(JSON.stringify(model), { level: 1 }))
          .catch((error: unknown) => { cachedResponse = undefined; throw error })
        const compressed = await cachedResponse
        if (response.destroyed) return
        if (request.headers['accept-encoding']?.includes('gzip')) {
          response.setHeader('Content-Encoding', 'gzip')
          response.end(compressed)
        } else {
          response.end(await decompress(compressed))
        }
      } catch (error) {
        if (response.destroyed) return
        response.statusCode = 500
        response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Could not read the block models.' }))
      }
    })
  }

  return { name: 'local-block-data', configureServer: serveBlockData, configurePreviewServer: serveBlockData }
}
