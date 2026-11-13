import { useEffect, useRef } from 'react'
import { Viewer } from '../viewer/Viewer'
import type { Block } from '../data/Block'

interface SceneViewerProps {
  blocks: readonly Block[]
}

export default function SceneViewer({ blocks }: SceneViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const viewer = new Viewer(container, blocks)
    return () => viewer.dispose()
  }, [blocks])

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden"
      role="img"
      aria-label="3D scene"
    />
  )
}
