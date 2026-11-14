import { useEffect, useRef } from 'react'
import { Viewer } from '../viewer/Viewer'

export default function SceneViewer() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const viewer = new Viewer(container)
    return () => viewer.dispose()
  }, [])

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden"
      role="img"
      aria-label="3D scene"
    />
  )
}
