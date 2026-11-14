import { join } from 'node:path'
import { promisify } from 'node:util'
import { gzip, gunzip } from 'node:zlib'
import type { PreviewServer, ViteDevServer } from 'vite'
import { readSceneMetadata, readSurface } from './readSceneData.ts'

const compress = promisify(gzip)
const decompress = promisify(gunzip)

export function serveSceneLayers(server: ViteDevServer | PreviewServer, directory: string): void {
  const routes = [
    { path: '/api/scene-layers', type: 'application/json', load: async () => Buffer.from(JSON.stringify(await readSceneMetadata(directory))) },
    ...(['before', 'after'] as const).map((view) => ({
      path: '/api/surface-' + view,
      type: 'application/octet-stream',
      load: async () => {
        const surface = await readSurface(join(directory, view === 'before' ? '1_pre_surface.csv' : '1_pst_surface.csv'))
        return Buffer.from(surface.buffer, surface.byteOffset, surface.byteLength)
      },
    })),
  ]
  for (const route of routes) {
    let cached: Promise<Buffer> | undefined
    server.middlewares.use(route.path, async (request, response) => {
      response.setHeader('Cache-Control', 'no-store')
      response.setHeader('Vary', 'Accept-Encoding')
      try {
        if (request.method !== 'GET') {
          response.statusCode = 405
          response.setHeader('Allow', 'GET')
          response.end()
          return
        }
        cached ??= route.load().then((data) => compress(data, { level: 1 })).catch((error: unknown) => { cached = undefined; throw error })
        const data = await cached
        if (response.destroyed) return
        response.setHeader('Content-Type', route.type)
        if (request.headers['accept-encoding']?.includes('gzip')) {
          response.setHeader('Content-Encoding', 'gzip')
          response.end(data)
        } else response.end(await decompress(data))
      } catch (error) {
        if (response.destroyed) return
        response.statusCode = 500
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Could not load scene layers.' }))
      }
    })
  }
}
