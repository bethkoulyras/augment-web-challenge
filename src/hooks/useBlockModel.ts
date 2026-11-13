import { useEffect, useState } from 'react'
import type { Block } from '../data/Block'
import { fetchBlocks } from '../data/fetchBlocks'

export function useBlockModel() {
  const [blocks, setBlocks] = useState<Block[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetchBlocks(controller.signal)
      .then((blocks) => {
        if (!controller.signal.aborted) setBlocks(blocks)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setError(error instanceof Error ? error.message : 'Could not load the block model.')
        }
      })

    return () => controller.abort()
  }, [])

  return { blocks, error, isLoading: blocks === null && error === null }
}
