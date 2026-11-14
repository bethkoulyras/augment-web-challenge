import { useEffect, useState } from 'react'
import type { BlockModel } from '../data/BlockModel'
import { fetchBlockModel } from '../data/fetchBlockModel'

export function useBlockModel() {
  const [model, setModel] = useState<BlockModel | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetchBlockModel(controller.signal)
      .then((model) => {
        if (!controller.signal.aborted) setModel(model)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setError(error instanceof Error ? error.message : 'Could not load the block model.')
        }
      })

    return () => controller.abort()
  }, [])

  return { model, error, isLoading: model === null && error === null }
}
