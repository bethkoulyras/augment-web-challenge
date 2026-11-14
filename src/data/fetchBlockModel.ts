import type { BlockModel } from './BlockModel'

export async function fetchBlockModel(signal: AbortSignal): Promise<BlockModel> {
  const response = await fetch('/api/block-model', { signal })
  const result: BlockModel & { error?: string } = await response.json()

  if (!response.ok) {
    throw new Error(result.error ?? 'Could not load the block models.')
  }

  return result
}
