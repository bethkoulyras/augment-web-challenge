import { useEffect, useState } from 'react'
import { loadCsv } from '../utils/loadCsv'
import { createBlastBoundarySegments } from './blastBoundary'
import type { BlastBoundaries } from './blastBoundary'
import { createBlastHoles } from './blastHoles'
import type { BlastHole } from './blastHoles'
import { parseBlocks } from './blockModels'
import type { Block } from './blockModels'
import { loadSurveySurfaces } from './surveySurfaces'
import type { SurveySurfaces } from './surveySurfaces'

export interface BlastData {
  blocks: readonly Block[]
  boundaries: BlastBoundaries
}

type LoadStage = 'block model' | 'blast boundaries'
type BlastLoad =
  | { status: 'loading'; stage: LoadStage }
  | { status: 'failed'; stage: LoadStage; message: string }
  | { status: 'ready'; data: BlastData }

const loadingModel = { status: 'loading', stage: 'block model' } as const

export function useBlastData() {
  const [blast, setBlast] = useState<BlastLoad>(loadingModel)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [blastHoles, setBlastHoles] = useState<BlastHole[]>([])
  const [surfaces, setSurfaces] = useState<SurveySurfaces | null>(null)
  const [showSurfaces, setShowSurfaces] = useState(true)
  const [surfaceLoadFailed, setSurfaceLoadFailed] = useState(false)
  const blastFailed = blast.status === 'failed'

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    const loadBlast = async (): Promise<void> => {
      let stage: LoadStage = 'block model'
      try {
        const rows = await loadCsv('/1_mbm.csv', signal)
        if (signal.aborted) return
        const blocks = parseBlocks(rows)

        stage = 'blast boundaries'
        setBlast({ status: 'loading', stage })
        const [pre, post] = await Promise.all([
          loadCsv('/1_pre_string.csv', signal).then(createBlastBoundarySegments),
          loadCsv('/1_pst_string.csv', signal).then(createBlastBoundarySegments),
        ])
        if (!signal.aborted) setBlast({ status: 'ready', data: { blocks, boundaries: { pre, post } } })
      } catch (error) {
        if (!signal.aborted) {
          const message = error instanceof Error ? error.message : 'Could not load the CSV.'
          setBlast({ status: 'failed', stage, message })
        }
      }
    }

    void loadBlast()
    loadCsv('/1_blastholes.csv', signal).then((rows) => {
      if (!signal.aborted) setBlastHoles(createBlastHoles(rows))
    }).catch(() => {
      if (!signal.aborted) setBlastHoles([])
    })

    return () => controller.abort()
  }, [loadAttempt])

  useEffect(() => {
    if (blastFailed || !showSurfaces || surfaces) return
    const controller = new AbortController()
    const { signal } = controller

    loadSurveySurfaces(signal).then((data) => {
      if (!signal.aborted) setSurfaces(data)
    }).catch(() => {
      if (signal.aborted) return
      setShowSurfaces(false)
      setSurfaceLoadFailed(true)
    })

    return () => controller.abort()
  }, [blastFailed, showSurfaces, surfaces])

  const toggleSurfaces = (): void => {
    setSurfaceLoadFailed(false)
    setShowSurfaces((show) => !show)
  }

  const retryLoading = (): void => {
    setBlast(loadingModel)
    setLoadAttempt((attempt) => attempt + 1)
  }

  return { blast, blastHoles, surfaces, showSurfaces, surfaceLoadFailed, toggleSurfaces, retryLoading }
}
