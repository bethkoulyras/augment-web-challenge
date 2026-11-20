import { useCallback, useEffect, useRef, useState } from 'react'
import { Viewer } from './Viewer'
import type { ViewerMode } from './Viewer'
import type { BlastData } from '../data/useBlastData'
import type { BlastHole } from '../data/blastHoles'
import type { ColourScale } from '../data/blockColours'
import type { Block, CategorySelection } from '../data/blockModels'
import type { SurveySurfaces } from '../data/surveySurfaces'

interface ViewerOptions {
  data: BlastData | null
  blastHoles: readonly BlastHole[]
  showBlastHoles: boolean
  showConnections: boolean
  surfaces: SurveySurfaces | null
  showSurfaces: boolean
  colourScale: ColourScale | undefined
  mode: ViewerMode
  sidebarOpen: boolean
  slicePosition: number | null
  selectedBlock: Block | null
  onSelectBlock: (block: Block | null) => void
  movementBlocks: readonly Block[] | null
  visibleBlocks: readonly Block[]
  visibleCount: number
  movementCount: number
  categorySelection: CategorySelection | null
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

  useEffect(() => {
    const container = containerRef.current
    if (!container || !data) return

    try {
      const viewer = new Viewer(container, data.blocks, onSliceChange, onSelectBlock)
      viewerRef.current = viewer
      return () => {
        viewerRef.current = null
        viewer.dispose()
      }
    } catch (error) {
      console.error(error)
      setViewerFailed(true)
    }
  }, [data, onSliceChange, onSelectBlock])

  useEffect(() => {
    if (data) viewerRef.current?.setBlastBoundaries(data.boundaries)
    viewerRef.current?.setBlastHoles(blastHoles)
  }, [data, blastHoles])

  useEffect(() => {
    if (surfaces) viewerRef.current?.setSurveySurfaces(surfaces)
  }, [data, surfaces])

  useEffect(() => {
    viewerRef.current?.setMovementBlocks(mode, movementBlocks ?? [])
  }, [data, mode, movementBlocks])

  useEffect(() => {
    viewerRef.current?.setVisibleBlocks(visibleBlocks)
    if (colourScale) viewerRef.current?.setColourScale(colourScale, mode === 'slice' ? categorySelection : null)
  }, [data, colourScale, mode, categorySelection, visibleBlocks, movementBlocks])

  // Dragging a grade cutoff can change the counts without rebuilding the meshes.
  useEffect(() => viewerRef.current?.setBlockCounts(visibleCount, movementCount), [data, mode, movementBlocks, visibleBlocks, visibleCount, movementCount])

  useEffect(() => {
    viewerRef.current?.setSelectedBlock(mode === 'inspect' ? selectedBlock : null)
  }, [data, mode, movementBlocks, selectedBlock])

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
