import type { Block } from './Block'

export async function fetchBlocks(signal: AbortSignal): Promise<Block[]> {
  const response = await fetch('/api/blocks', { signal })
  const result: { blocks: Block[]; error?: string } = await response.json()

  if (!response.ok) {
    throw new Error(result.error ?? 'Could not load the block model.')
  }

  return result.blocks
}
