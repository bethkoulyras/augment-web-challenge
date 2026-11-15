import { useEffect, useRef } from 'react'
import { Viewer } from '../viewer/Viewer'
import type { BlockModels, ModelView } from '../data/blockModels'

interface SceneViewerProps {
  models: BlockModels
  view: ModelView
}

export default function SceneViewer({ models, view }: SceneViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<Viewer | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const viewer = new Viewer(container, models)
    viewerRef.current = viewer
    return () => {
      viewerRef.current = null
      viewer.dispose()
    }
  }, [models])

  useEffect(() => viewerRef.current?.setView(view), [models, view])

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden"
      role="img"
      aria-label={view === 'pre' ? '3D pre-blast block model' : '3D predicted post-blast block model'}
    />
  )
}
