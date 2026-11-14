import type { BlockModel } from './BlockModel'
import type { SceneMetadata } from './SceneLayers'

async function getResponse(path: string, signal: AbortSignal): Promise<Response> {
  const response = await fetch(path, { signal })
  if (!response.ok) {
    const error: { error?: string } = await response.json()
    throw new Error(error.error ?? 'Could not load the scene data.')
  }
  return response
}

export async function fetchBlockModel(signal: AbortSignal): Promise<BlockModel> {
  const [model, metadata, before, after] = await Promise.all([
    getResponse('/api/block-model', signal).then((response) => response.json()) as Promise<Omit<BlockModel, 'layers'>>,
    getResponse('/api/scene-layers', signal).then((response) => response.json()) as Promise<SceneMetadata>,
    getResponse('/api/surface-before', signal).then((response) => response.arrayBuffer()),
    getResponse('/api/surface-after', signal).then((response) => response.arrayBuffer()),
  ])
  if (before.byteLength % 36 !== 0 || after.byteLength % 36 !== 0) throw new Error('Incomplete survey triangles.')
  return { ...model, layers: { ...metadata, surfaces: { before: new Float32Array(before), after: new Float32Array(after) } } }
}
