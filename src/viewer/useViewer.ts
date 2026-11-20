import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { Viewer } from './Viewer'
import type { BlockView } from './Viewer'
import type { BlastData } from '../data/useBlastData'
import type { BlastHole } from '../data/blastHoles'
import type { Block } from '../data/blockModels'
import type { SurveySurfaces } from '../data/surveySurfaces'

interface ViewerOptions extends BlockView {
  data: BlastData | null
  blastHoles: readonly BlastHole[]
  showBlastHoles: boolean
  showConnections: boolean
  surfaces: SurveySurfaces | null
  showSurfaces: boolean
  sidebarOpen: boolean
  slicePosition: number | null
  onSelectBlock: (block: Block | null) => void
  onSliceChange: (position: number) => void
}

export function useViewer({
  data, blastHoles, showBlastHoles, showConnections, surfaces, showSurfaces,
  colourScale, mode, sidebarOpen, slicePosition, movementBlocks, visibleBlocks, visibleCount,
  movementCount, categorySelection, selectedBlock, onSelectBlock, onSliceChange,
}: ViewerOptions) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Viewer | null>(null)
  const [viewerFailed, setViewerFailed] = useState(false)
  const blocks = data?.blocks
  const notifySliceChange = useEffectEvent(onSliceChange)
  const notifyBlockSelection = useEffectEvent(onSelectBlock)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !blocks) return

    try {
      const viewer = new Viewer(container, blocks, notifySliceChange, notifyBlockSelection)
      viewerRef.current = viewer
      return () => {
        viewerRef.current = null
        viewer.dispose()
      }
    } catch (error) {
      console.error(error)
      setViewerFailed(true)
    }
  }, [blocks])

  useEffect(() => {
    if (data) viewerRef.current?.setBlastBoundaries(data.boundaries)
  }, [data])

  useEffect(() => {
    viewerRef.current?.setBlastHoles(blastHoles)
  }, [data, blastHoles])

  useEffect(() => {
    if (surfaces) viewerRef.current?.setSurveySurfaces(surfaces)
  }, [data, surfaces])

  useEffect(() => {
    viewerRef.current?.setBlockView({
      mode, movementBlocks, visibleBlocks, visibleCount, movementCount, colourScale, categorySelection, selectedBlock,
    })
  }, [data, mode, movementBlocks, visibleBlocks, visibleCount, movementCount, colourScale, categorySelection, selectedBlock])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return
    viewer.setSidebarOpen(sidebarOpen)
    viewer.setBlastHolesVisible(showBlastHoles)
    viewer.setSurveySurfacesVisible(showSurfaces)
    viewer.setConnectionsVisible(showConnections)
  }, [data, sidebarOpen, showBlastHoles, showSurfaces, showConnections])

  useEffect(() => {
    if (mode !== 'model' && slicePosition !== null) viewerRef.current?.setSlicePosition(slicePosition)
    if (mode === 'inspect') viewerRef.current?.frameSection()
  }, [data, mode, slicePosition])

  const resetView = useCallback(() => viewerRef.current?.resetView(), [])
  const setProgress = useCallback((progress: number) => viewerRef.current?.setMovementProgress(progress), [])

  return { containerRef, viewerFailed, resetView, setProgress }
}
