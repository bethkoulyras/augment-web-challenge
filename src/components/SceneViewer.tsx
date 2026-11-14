import { useEffect, useRef } from 'react'
import { Viewer } from '../viewer/Viewer'
import type { LayerVisibility } from '../data/SceneLayers'
import type { BlockModel, ModelView } from '../data/BlockModel'

interface SceneViewerProps {
  model: BlockModel
  view: ModelView
  visibility: LayerVisibility
}

export default function SceneViewer({ model, view, visibility }: SceneViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const viewerRef = useRef<Viewer | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const viewer = new Viewer(container, model)
    viewerRef.current = viewer
    return () => {
      viewerRef.current = null
      viewer.dispose()
    }
  }, [model])

  useEffect(() => viewerRef.current?.setView(view), [model, view])

  useEffect(() => viewerRef.current?.setLayerVisibility(visibility), [model, visibility])

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden"
      role="img"
      aria-label={view === 'before' ? '3D pre-blast block model' : '3D OMP predicted post-blast block model'}
    />
  )
}
